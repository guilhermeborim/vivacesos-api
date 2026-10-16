import { z } from 'zod';

export const updateSettingsSchema = z.object({
  recurringExpensesEnabled: z.boolean('Informe true ou false').optional(),
});

export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;
