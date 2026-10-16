import { z } from 'zod';

export const selectClinicSchema = z.object({
  clinicId: z.uuid('Clínica inválida!'),
});

export type SelectClinicDto = z.infer<typeof selectClinicSchema>;
