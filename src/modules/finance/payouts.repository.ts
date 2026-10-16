import { ConflictException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface Eligible {
  count: number;
  /** Soma bruta das consultas em centavos (evita erro de ponto flutuante). */
  grossCents: number;
}

export interface LaunchInput {
  clinicId: string;
  professionalId: string;
  percent: number;
  cutoffAt: Date;
  dueDate: string;
  description: string;
  createdBy: string;
}

export interface PayoutRow {
  payoutId: string;
  professionalId: string;
  professionalName: string | null;
  percent: number;
  grossAmount: number;
  amount: number;
  cutoffAt: Date;
  createdAt: Date;
  expenseId: string;
  paid: boolean;
  paidAt: Date | null;
  dueDate: string;
}

/** Repasses e a regra de elegibilidade das consultas. Sempre escopado por clínica. */
@Injectable()
export class PayoutsRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Consultas pagas até `cutoffAt` que ainda não entraram em nenhum repasse. */
  async eligible(
    clinicId: string,
    professionalId: string,
    cutoffAt: Date,
  ): Promise<Eligible> {
    const [row] = await this.dataSource.query<
      { count: number; cents: string | null }[]
    >(
      `SELECT count(*)::int AS count, sum(round(a.price * 100))::bigint AS cents
       FROM appointments a
       WHERE a."clinicId" = $1 AND a."professionalId" = $2
         AND a.paid = true AND a."payoutId" IS NULL AND a."paidAt" <= $3`,
      [clinicId, professionalId, cutoffAt],
    );
    return { count: row.count, grossCents: Number(row.cents ?? 0) };
  }

  /**
   * Cria despesa + repasse e marca as consultas, tudo numa transação. As consultas
   * elegíveis são travadas (`FOR UPDATE`) para dois lançamentos simultâneos não
   * repassarem a mesma consulta duas vezes.
   */
  launch(input: LaunchInput) {
    return this.dataSource.transaction(async (manager) => {
      const rows = await manager.query<{ id: string; cents: string }[]>(
        `SELECT a.id, round(a.price * 100)::bigint AS cents
         FROM appointments a
         WHERE a."clinicId" = $1 AND a."professionalId" = $2
           AND a.paid = true AND a."payoutId" IS NULL AND a."paidAt" <= $3
         FOR UPDATE`,
        [input.clinicId, input.professionalId, input.cutoffAt],
      );
      const grossCents = rows.reduce((sum, r) => sum + Number(r.cents), 0);
      if (rows.length === 0 || grossCents <= 0) {
        throw new ConflictException(
          'Não há consultas pagas pendentes de repasse até a data informada!',
        );
      }
      const amountCents = Math.round((grossCents * input.percent) / 100);
      if (amountCents <= 0) {
        throw new ConflictException('O valor do repasse resultou em zero!');
      }

      const [expense] = await manager.query<{ id: string }[]>(
        `INSERT INTO expenses ("clinicId", description, category, amount, "dueDate", notes)
         VALUES ($1, $2, 'Repasse', $3, $4, $5)
         RETURNING id`,
        [
          input.clinicId,
          input.description,
          amountCents / 100,
          input.dueDate,
          `${input.percent}% sobre R$ ${(grossCents / 100).toFixed(2)} (${rows.length} consulta(s))`,
        ],
      );
      const [payout] = await manager.query<{ id: string }[]>(
        `INSERT INTO payouts ("clinicId", "professionalId", "expenseId", percent,
                              "grossAmount", amount, "cutoffAt", "createdBy")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          input.clinicId,
          input.professionalId,
          expense.id,
          input.percent,
          grossCents / 100,
          amountCents / 100,
          input.cutoffAt,
          input.createdBy,
        ],
      );
      await manager.query(
        `UPDATE appointments SET "payoutId" = $1 WHERE id = ANY($2::uuid[])`,
        [payout.id, rows.map((r) => r.id)],
      );

      return {
        payoutId: payout.id,
        expenseId: expense.id,
        count: rows.length,
        grossAmount: grossCents / 100,
        amount: amountCents / 100,
      };
    });
  }

  list(clinicId: string, filters: { professionalId?: string; paid?: boolean }) {
    return this.dataSource.query<PayoutRow[]>(
      `SELECT p.id AS "payoutId", p."professionalId", u.name AS "professionalName",
              p.percent::float AS percent, p."grossAmount"::float AS "grossAmount",
              p.amount::float AS amount, p."cutoffAt", p."createdAt",
              e.id AS "expenseId", e.paid, e."paidAt", e."dueDate"::text AS "dueDate"
       FROM payouts p
       INNER JOIN expenses e ON e.id = p."expenseId"
       INNER JOIN professionals pr ON pr.id = p."professionalId"
       LEFT JOIN users u ON u.id = pr."userId"
       WHERE p."clinicId" = $1
         AND ($2::uuid IS NULL OR p."professionalId" = $2::uuid)
         AND ($3::boolean IS NULL OR e.paid = $3::boolean)
       ORDER BY p."createdAt" DESC`,
      [clinicId, filters.professionalId ?? null, filters.paid ?? null],
    );
  }

  async findByExpenseIds(clinicId: string, expenseIds: string[]) {
    if (!expenseIds.length) return new Map<string, string>();
    const rows = await this.dataSource.query<
      { expenseId: string; payoutId: string }[]
    >(
      `SELECT "expenseId", id AS "payoutId" FROM payouts
       WHERE "clinicId" = $1 AND "expenseId" = ANY($2::uuid[])`,
      [clinicId, expenseIds],
    );
    return new Map(rows.map((r) => [r.expenseId, r.payoutId]));
  }

  /** Repasse ligado à despesa (com o profissional), se a despesa for um repasse. */
  async detailsByExpenseId(clinicId: string, expenseId: string) {
    const [row] = await this.dataSource.query<
      {
        payoutId: string;
        amount: number;
        professionalName: string | null;
        professionalUserId: string | null;
      }[]
    >(
      `SELECT p.id AS "payoutId", p.amount::float AS amount,
              u.name AS "professionalName", pr."userId" AS "professionalUserId"
       FROM payouts p
       INNER JOIN professionals pr ON pr.id = p."professionalId"
       LEFT JOIN users u ON u.id = pr."userId"
       WHERE p."clinicId" = $1 AND p."expenseId" = $2`,
      [clinicId, expenseId],
    );
    return row ?? null;
  }

  async existsForExpense(clinicId: string, expenseId: string) {
    const map = await this.findByExpenseIds(clinicId, [expenseId]);
    return map.has(expenseId);
  }

  /** Desfaz o repasse (só enquanto a despesa não foi paga): apaga repasse e despesa, libera as consultas. */
  undo(clinicId: string, payoutId: string) {
    return this.dataSource.transaction(async (manager) => {
      const [row] = await manager.query<{ expenseId: string; paid: boolean }[]>(
        `SELECT p."expenseId", e.paid
         FROM payouts p INNER JOIN expenses e ON e.id = p."expenseId"
         WHERE p."clinicId" = $1 AND p.id = $2
         FOR UPDATE OF p, e`,
        [clinicId, payoutId],
      );
      if (!row) return null;
      if (row.paid) {
        throw new ConflictException(
          'Este repasse já foi pago e não pode ser desfeito!',
        );
      }
      await manager.query(`DELETE FROM payouts WHERE id = $1`, [payoutId]);
      await manager.query(`DELETE FROM expenses WHERE id = $1`, [
        row.expenseId,
      ]);
      return true;
    });
  }
}
