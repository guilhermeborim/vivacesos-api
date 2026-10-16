import { z } from 'zod';
import { EXPENSE_RECURRENCES } from '../recurrence.js';
import { AppointmentStatus } from '../../appointments/enums/appointment-status.enum.js';

const datetime = (message: string) => z.iso.datetime({ offset: true, message });
const date = (message: string) => z.iso.date({ message });
const boolQuery = z.enum(['true', 'false']).transform((v) => v === 'true');

const amount = z
  .number('O valor deve ser um número')
  .positive('O valor deve ser maior que zero')
  .max(99999999.99, 'Valor muito alto')
  .multipleOf(0.01, 'O valor deve ter no máximo 2 casas decimais');

/** startsAt: data da consulta/vencimento; paidAt: data do pagamento. */
const dateField = z.enum(['startsAt', 'paidAt']).default('startsAt');

export const revenuesQuerySchema = z.object({
  from: datetime('from deve ser uma data/hora ISO válida').optional(),
  to: datetime('to deve ser uma data/hora ISO válida').optional(),
  dateField,
  professionalId: z.uuid().optional(),
  paid: boolQuery.optional(),
  status: z.enum(AppointmentStatus).optional(),
});

export const summaryQuerySchema = z.object({
  from: datetime('from deve ser uma data/hora ISO válida').optional(),
  to: datetime('to deve ser uma data/hora ISO válida').optional(),
  dateField,
  professionalId: z.uuid().optional(),
});

export const registerExpenseSchema = z.object({
  description: z.string().trim().min(1, 'A descrição é obrigatória').max(255),
  category: z.string().trim().min(1).max(100).optional(),
  amount,
  dueDate: date('dueDate deve ser uma data (AAAA-MM-DD)'),
  notes: z.string().max(2000).optional(),
  /** Exige a opção de despesas recorrentes ligada em Configurações. */
  recurrence: z.enum(EXPENSE_RECURRENCES).default('NONE'),
  recurrenceEndsAt: date(
    'recurrenceEndsAt deve ser uma data (AAAA-MM-DD)',
  ).optional(),
});

export const updateExpenseSchema = z.object({
  description: z.string().trim().min(1).max(255).optional(),
  category: z.string().trim().min(1).max(100).nullable().optional(),
  amount: amount.optional(),
  dueDate: date('dueDate deve ser uma data (AAAA-MM-DD)').optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const listExpensesSchema = z.object({
  from: date('from deve ser uma data (AAAA-MM-DD)').optional(),
  to: date('to deve ser uma data (AAAA-MM-DD)').optional(),
  dateField,
  paid: boolQuery.optional(),
  category: z.string().optional(),
});

export type RevenuesQueryDto = z.infer<typeof revenuesQuerySchema>;
export type SummaryQueryDto = z.infer<typeof summaryQuerySchema>;
export type RegisterExpenseDto = z.infer<typeof registerExpenseSchema>;
export type UpdateExpenseDto = z.infer<typeof updateExpenseSchema>;
export type ListExpensesDto = z.infer<typeof listExpensesSchema>;

const percent = z
  .number('O percentual deve ser um número')
  .gt(0, 'O percentual deve ser maior que zero')
  .max(100, 'O percentual deve ser no máximo 100')
  .multipleOf(0.01, 'O percentual deve ter no máximo 2 casas decimais');

export const payoutPreviewSchema = z.object({
  professionalId: z.uuid(),
  /** Pagamentos até este momento entram no repasse; padrão: agora. */
  cutoffAt: datetime('cutoffAt deve ser uma data/hora ISO válida').optional(),
  percent: z.coerce.number().gt(0).max(100).optional(),
});

export const createPayoutSchema = z.object({
  professionalId: z.uuid('O profissional é obrigatório'),
  /** Se omitido, usa o percentual cadastrado no profissional. */
  percent: percent.optional(),
  cutoffAt: datetime('cutoffAt deve ser uma data/hora ISO válida').optional(),
  dueDate: date('dueDate deve ser uma data (AAAA-MM-DD)').optional(),
});

export const listPayoutsSchema = z.object({
  professionalId: z.uuid().optional(),
  paid: boolQuery.optional(),
});

export type PayoutPreviewDto = z.infer<typeof payoutPreviewSchema>;
export type CreatePayoutDto = z.infer<typeof createPayoutSchema>;
export type ListPayoutsDto = z.infer<typeof listPayoutsSchema>;
