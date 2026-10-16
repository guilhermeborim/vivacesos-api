export const EXPENSE_RECURRENCES = [
  'NONE',
  'DAILY',
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
] as const;

export type ExpenseRecurrence = (typeof EXPENSE_RECURRENCES)[number];

const toUtc = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

const toIso = (date: Date) => date.toISOString().slice(0, 10);

const addDays = (iso: string, days: number) => {
  const date = toUtc(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
};

/**
 * Próxima ocorrência depois de `iso`. Na mensal, `anchorDay` (dia do vencimento original)
 * é respeitado e limitado ao fim do mês (31/01 → 28/02 → 31/03).
 */
export function nextOccurrence(
  iso: string,
  recurrence: Exclude<ExpenseRecurrence, 'NONE'>,
  anchorDay: number,
) {
  switch (recurrence) {
    case 'DAILY':
      return addDays(iso, 1);
    case 'WEEKLY':
      return addDays(iso, 7);
    case 'BIWEEKLY':
      return addDays(iso, 14);
    case 'MONTHLY': {
      const [y, m] = iso.split('-').map(Number);
      const nextMonthIndex = m; // mês seguinte (0-based = m)
      const lastDay = new Date(Date.UTC(y, nextMonthIndex + 1, 0)).getUTCDate();
      return toIso(
        new Date(Date.UTC(y, nextMonthIndex, Math.min(anchorDay, lastDay))),
      );
    }
  }
}
