import { z } from 'zod';

const isValidTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const dashboardQuerySchema = z.object({
  /** Mês consultado (AAAA-MM). */
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month deve ser AAAA-MM'),
  /** Fuso (IANA) usado para os limites do dia e do mês. */
  tz: z
    .string()
    .refine(isValidTimeZone, 'Fuso horário inválido')
    .default('America/Sao_Paulo'),
});

export type DashboardQueryDto = z.infer<typeof dashboardQuerySchema>;
