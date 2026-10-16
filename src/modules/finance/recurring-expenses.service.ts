import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  CLINIC_RECURRING_ENABLED,
  type ClinicRecurringEnabledEvent,
  EXPENSE_RECURRING_CREATED,
  type ExpenseRecurringCreatedEvent,
} from '../../common/events/domain.events.js';
import { type ExpenseRecurrence, nextOccurrence } from './recurrence.js';

const SAO_PAULO = 'America/Sao_Paulo';
/** Atraso do servidor: recupera no máximo estas ocorrências; o restante é pulado. */
const MAX_CATCH_UP = 12;
/** Trava de segurança ao pular datas (diária parada por anos). */
const MAX_SKIP_STEPS = 5000;

export const todayInSaoPaulo = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: SAO_PAULO }).format(new Date());

interface Template {
  id: string;
  clinicId: string;
  description: string;
  category: string | null;
  amount: string;
  notes: string | null;
  recurrence: Exclude<ExpenseRecurrence, 'NONE'>;
  recurrenceEndsAt: string | null;
  recurrenceNextDate: string;
  recurrenceDay: number;
}

type Advance = { next: string; ended: boolean };

/** Avança até a primeira ocorrência depois de `after` e informa se a série terminou. */
function skipAhead(t: Template, from: string, after: string): Advance {
  let next = from;
  for (let i = 0; i < MAX_SKIP_STEPS && next <= after; i++) {
    next = nextOccurrence(next, t.recurrence, t.recurrenceDay);
  }
  return { next, ended: !!t.recurrenceEndsAt && next > t.recurrenceEndsAt };
}

@Injectable()
export class RecurringExpensesService {
  private readonly logger = new Logger(RecurringExpensesService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly events: EventEmitter2,
  ) {}

  /** Todo dia às 06:00 (Brasília): cria as despesas recorrentes que vencem até hoje. */
  @Cron('0 0 6 * * *', { name: 'recurring-expenses', timeZone: SAO_PAULO })
  async runDaily() {
    const created = await this.generateDue();
    this.logger.log(`Despesas recorrentes criadas: ${created}`);
  }

  /**
   * Gera as ocorrências vencidas (`recurrenceNextDate <= today`) das clínicas com a opção
   * ligada. Idempotente: o índice único (seriesId, dueDate) impede duplicar, e
   * `FOR UPDATE SKIP LOCKED` evita que duas execuções disputem a mesma série.
   */
  async generateDue(today = todayInSaoPaulo()) {
    const events: ExpenseRecurringCreatedEvent[] = [];

    await this.dataSource.transaction(async (manager) => {
      const templates = await manager.query<Template[]>(
        `SELECT e.id, e."clinicId", e.description, e.category, e.amount::text AS amount, e.notes,
                e.recurrence::text AS recurrence, e."recurrenceEndsAt"::text AS "recurrenceEndsAt",
                e."recurrenceNextDate"::text AS "recurrenceNextDate", e."recurrenceDay"
         FROM expenses e
         INNER JOIN clinic_settings s ON s."clinicId" = e."clinicId" AND s."recurringExpensesEnabled"
         WHERE e.recurrence <> 'NONE' AND e."recurrenceNextDate" <= $1::date
         FOR UPDATE OF e SKIP LOCKED`,
        [today],
      );

      for (const t of templates) {
        let next = t.recurrenceNextDate;
        let ended = false;
        let created = 0;

        while (next <= today && created < MAX_CATCH_UP) {
          if (t.recurrenceEndsAt && next > t.recurrenceEndsAt) {
            ended = true;
            break;
          }
          const inserted = await manager.query<{ id: string }[]>(
            `INSERT INTO expenses ("clinicId", description, category, amount, "dueDate", notes, "seriesId")
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT ("seriesId", "dueDate") WHERE "seriesId" IS NOT NULL DO NOTHING
             RETURNING id`,
            [
              t.clinicId,
              t.description,
              t.category,
              t.amount,
              next,
              t.notes,
              t.id,
            ],
          );
          if (inserted.length) {
            created++;
            events.push({
              clinicId: t.clinicId,
              expenseId: inserted[0].id,
              description: t.description,
              amount: Number(t.amount),
              dueDate: next,
            });
          }
          next = nextOccurrence(next, t.recurrence, t.recurrenceDay);
        }

        if (!ended && next <= today) {
          // Atraso grande: o que passou do limite é pulado, sem enxurrada de despesas.
          ({ next, ended } = skipAhead(t, next, today));
        } else if (!ended) {
          ended = !!t.recurrenceEndsAt && next > t.recurrenceEndsAt;
        }

        await manager.query(
          ended
            ? `UPDATE expenses SET recurrence = 'NONE', "recurrenceNextDate" = NULL WHERE id = $1`
            : `UPDATE expenses SET "recurrenceNextDate" = $2 WHERE id = $1`,
          ended ? [t.id] : [t.id, next],
        );
      }
    });

    for (const event of events) {
      await this.events.emitAsync(EXPENSE_RECURRING_CREATED, event);
    }
    return events.length;
  }

  @OnEvent(CLINIC_RECURRING_ENABLED)
  async onRecurringEnabled(event: ClinicRecurringEnabledEvent) {
    await this.skipMissed(event.clinicId);
  }

  /** Ao religar a opção, ocorrências do período desligado não viram despesas: pula para a próxima futura. */
  async skipMissed(clinicId: string, today = todayInSaoPaulo()) {
    await this.dataSource.transaction(async (manager) => {
      const templates = await manager.query<Template[]>(
        `SELECT id, "clinicId", description, category, amount::text AS amount, notes,
                recurrence::text AS recurrence, "recurrenceEndsAt"::text AS "recurrenceEndsAt",
                "recurrenceNextDate"::text AS "recurrenceNextDate", "recurrenceDay"
         FROM expenses
         WHERE "clinicId" = $1 AND recurrence <> 'NONE' AND "recurrenceNextDate" <= $2::date
         FOR UPDATE`,
        [clinicId, today],
      );
      for (const t of templates) {
        const { next, ended } = skipAhead(t, t.recurrenceNextDate, today);
        await manager.query(
          ended
            ? `UPDATE expenses SET recurrence = 'NONE', "recurrenceNextDate" = NULL WHERE id = $1`
            : `UPDATE expenses SET "recurrenceNextDate" = $2 WHERE id = $1`,
          ended ? [t.id] : [t.id, next],
        );
      }
    });
  }
}
