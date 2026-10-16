import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PAYOUT_PAID } from '../../common/events/domain.events.js';
import {
  buildPayment,
  type PaymentDto,
} from '../../common/schemas/payment.schema.js';
import type { Expense } from './entities/expense.entity.js';
import { ExpensesRepository } from './expenses.repository.js';
import { SettingsRepository } from '../settings/settings.repository.js';
import { PayoutsRepository } from './payouts.repository.js';
import { nextOccurrence } from './recurrence.js';
import type {
  ListExpensesDto,
  RegisterExpenseDto,
  UpdateExpenseDto,
} from './schemas/finance.schema.js';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly expenses: ExpensesRepository,
    private readonly payouts: PayoutsRepository,
    private readonly events: EventEmitter2,
    private readonly settings: SettingsRepository,
  ) {}

  async register(clinicId: string, input: RegisterExpenseDto) {
    const { recurrence, recurrenceEndsAt, ...data } = input;
    let recurrenceData = {};

    if (recurrence !== 'NONE') {
      if (!(await this.settings.isRecurringEnabled(clinicId))) {
        throw new ConflictException(
          'As despesas recorrentes estão desativadas. O ADMIN pode ligá-las em Configurações!',
        );
      }
      const anchorDay = Number(input.dueDate.slice(8, 10));
      const next = nextOccurrence(input.dueDate, recurrence, anchorDay);
      if (recurrenceEndsAt && recurrenceEndsAt < next) {
        throw new BadRequestException(
          'A data final deve permitir ao menos uma repetição depois do vencimento!',
        );
      }
      recurrenceData = {
        recurrence,
        recurrenceEndsAt: recurrenceEndsAt ?? null,
        recurrenceNextDate: next,
        recurrenceDay: anchorDay,
      };
    }

    const created = await this.expenses.create({
      clinicId,
      ...data,
      ...recurrenceData,
    });
    return this.toResponse(created);
  }

  /** Encerra a recorrência da série (vale pela despesa-modelo ou por qualquer ocorrência gerada). */
  async stopRecurrence(clinicId: string, id: string) {
    const expense = await this.getOrFail(clinicId, id);
    const templateId = expense.seriesId ?? expense.id;
    const template =
      templateId === expense.id
        ? expense
        : await this.expenses.findById(clinicId, templateId);
    if (!template || template.recurrence === 'NONE') {
      throw new ConflictException('Esta despesa não tem recorrência ativa!');
    }
    await this.expenses.update(template.id, {
      recurrence: 'NONE',
      recurrenceNextDate: null,
    });
  }

  async findByClinic(clinicId: string, filters: ListExpensesDto) {
    const [list, totals] = await Promise.all([
      this.expenses.findByClinic(clinicId, filters),
      this.expenses.totals(clinicId, filters),
    ]);
    const payoutByExpense = await this.payouts.findByExpenseIds(
      clinicId,
      list.map((e) => e.id),
    );
    return {
      totals,
      expenses: list.map((e) =>
        this.toResponse(e, payoutByExpense.get(e.id) ?? null),
      ),
    };
  }

  async findById(clinicId: string, id: string) {
    return this.toResponse(await this.getOrFail(clinicId, id));
  }

  async update(clinicId: string, id: string, input: UpdateExpenseDto) {
    await this.getOrFail(clinicId, id);
    if (
      (input.amount !== undefined || input.dueDate !== undefined) &&
      (await this.payouts.existsForExpense(clinicId, id))
    ) {
      throw new ConflictException(
        'Valor e vencimento de um repasse não podem ser alterados. Desfaça o repasse e lance de novo!',
      );
    }
    await this.expenses.update(id, input);
  }

  async updatePayment(
    clinicId: string,
    actorUserId: string,
    id: string,
    input: PaymentDto,
  ) {
    const expense = await this.getOrFail(clinicId, id);
    await this.expenses.update(id, buildPayment(input));

    // Repasse que acabou de ser pago avisa o profissional e o ADMIN.
    if (input.paid && !expense.paid) {
      const payout = await this.payouts.detailsByExpenseId(clinicId, id);
      if (payout) {
        await this.events.emitAsync(PAYOUT_PAID, {
          clinicId,
          payoutId: payout.payoutId,
          professionalUserId: payout.professionalUserId,
          professionalName: payout.professionalName,
          amount: payout.amount,
          actorUserId,
        });
      }
    }
  }

  async remove(clinicId: string, id: string) {
    await this.getOrFail(clinicId, id);
    if (await this.payouts.existsForExpense(clinicId, id)) {
      throw new ConflictException(
        'Esta despesa é um repasse. Use “Desfazer repasse” em vez de removê-la!',
      );
    }
    await this.expenses.delete(id);
  }

  private async getOrFail(clinicId: string, id: string) {
    const expense = await this.expenses.findById(clinicId, id);
    if (!expense) throw new NotFoundException('Despesa não encontrada!');
    return expense;
  }

  private toResponse(e: Expense, payoutId: string | null = null) {
    return {
      payoutId,
      recurrence: e.recurrence,
      recurrenceEndsAt: e.recurrenceEndsAt,
      recurrenceNextDate: e.recurrenceNextDate,
      isRecurrenceOccurrence: e.seriesId !== null,
      expenseId: e.id,
      description: e.description,
      category: e.category,
      amount: e.amount,
      dueDate: e.dueDate,
      paid: e.paid,
      paidAt: e.paidAt,
      paymentMethod: e.paymentMethod,
      notes: e.notes,
    };
  }
}
