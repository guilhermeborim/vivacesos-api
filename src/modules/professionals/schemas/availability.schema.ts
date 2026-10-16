import { z } from 'zod';

/** Substitui a agenda inteira. Horas 0–23 (cada uma vale 1 h). */
export const updateAvailabilitySchema = z.object({
  restricted: z.boolean('Informe se o atendimento é restrito'),
  days: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        hours: z.array(z.number().int().min(0).max(23)).max(24),
      }),
    )
    .max(7)
    .refine(
      (days) => new Set(days.map((d) => d.weekday)).size === days.length,
      {
        message: 'Dia da semana repetido',
      },
    ),
});

export type UpdateAvailabilityDto = z.infer<typeof updateAvailabilitySchema>;
