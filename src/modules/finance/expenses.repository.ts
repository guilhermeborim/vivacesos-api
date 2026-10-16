import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type SelectQueryBuilder } from 'typeorm';
import { Expense } from './entities/expense.entity.js';
import type { ExpenseRecurrence } from './recurrence.js';

export interface NewExpense {
  clinicId: string;
  description: string;
  category?: string;
  amount: number;
  dueDate: string;
  notes?: string;
  recurrence?: ExpenseRecurrence;
  recurrenceEndsAt?: string | null;
  recurrenceNextDate?: string | null;
  recurrenceDay?: number | null;
}

export interface ExpenseFilters {
  from?: string;
  to?: string;
  dateField: 'startsAt' | 'paidAt';
  paid?: boolean;
  category?: string;
}

/** Todas as despesas são escopadas por clínica (multi-tenant). */
@Injectable()
export class ExpensesRepository {
  constructor(
    @InjectRepository(Expense)
    private readonly repository: Repository<Expense>,
  ) {}

  create(expense: NewExpense) {
    return this.repository.save(expense);
  }

  findByClinic(clinicId: string, filters: ExpenseFilters) {
    return this.filtered(clinicId, filters)
      .orderBy('e.dueDate', 'ASC')
      .getMany();
  }

  findById(clinicId: string, id: string) {
    return this.repository.findOne({ where: { clinicId, id } });
  }

  /** Totais pagos e a pagar, com os mesmos filtros da listagem. */
  async totals(clinicId: string, filters: ExpenseFilters) {
    const row = await this.filtered(clinicId, filters)
      .select('COALESCE(SUM(e.amount) FILTER (WHERE e.paid), 0)', 'paid')
      .addSelect(
        'COALESCE(SUM(e.amount) FILTER (WHERE NOT e.paid), 0)',
        'pending',
      )
      .getRawOne<{ paid: string; pending: string }>();
    return { paid: Number(row?.paid ?? 0), pending: Number(row?.pending ?? 0) };
  }

  async update(id: string, data: Partial<Expense>) {
    await this.repository.update(id, data);
  }

  async delete(id: string) {
    await this.repository.delete(id);
  }

  private filtered(
    clinicId: string,
    { from, to, dateField, paid, category }: ExpenseFilters,
  ): SelectQueryBuilder<Expense> {
    const column = dateField === 'paidAt' ? 'e.paidAt' : 'e.dueDate';
    const qb = this.repository
      .createQueryBuilder('e')
      .where('e.clinicId = :clinicId', { clinicId });
    if (from) qb.andWhere(`${column} >= :from`, { from });
    if (to) {
      // paidAt é timestamptz: inclui o dia inteiro de `to`.
      if (dateField === 'paidAt') {
        qb.andWhere(`${column} < (CAST(:to AS date) + 1)`, { to });
      } else {
        qb.andWhere(`${column} <= :to`, { to });
      }
    }
    if (paid !== undefined) qb.andWhere('e.paid = :paid', { paid });
    if (category) qb.andWhere('e.category = :category', { category });
    return qb;
  }
}
