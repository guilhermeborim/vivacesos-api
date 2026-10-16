import { z } from 'zod';
import { RecordAuditAction } from '../enums/record-audit-action.enum.js';

const content = z
  .string('O conteúdo é obrigatório')
  .trim()
  .min(1, 'O conteúdo é obrigatório')
  .max(20000, 'O conteúdo deve ter no máximo 20000 caracteres');

/** Ficha nova (de uma consulta) ou adendo (de outra ficha, herda a consulta). */
export const createEntrySchema = z
  .object({
    appointmentId: z.uuid().optional(),
    parentEntryId: z.uuid().optional(),
    content,
  })
  .refine((v) => !!v.appointmentId !== !!v.parentEntryId, {
    message: 'Informe a consulta (ficha) ou a ficha original (adendo)',
    path: ['appointmentId'],
  });

export const cancelEntrySchema = z.object({
  reason: z
    .string('A justificativa é obrigatória')
    .trim()
    .min(5, 'A justificativa deve ter ao menos 5 caracteres')
    .max(2000, 'A justificativa deve ter no máximo 2000 caracteres'),
});

export const dayRecordsSchema = z.object({
  from: z.iso.datetime({ offset: true, message: 'from deve ser ISO válido' }),
  to: z.iso.datetime({ offset: true, message: 'to deve ser ISO válido' }),
});

export const listAuditSchema = z.object({
  from: z.iso
    .datetime({ offset: true, message: 'from deve ser ISO válido' })
    .optional(),
  to: z.iso
    .datetime({ offset: true, message: 'to deve ser ISO válido' })
    .optional(),
  userId: z.uuid().optional(),
  patientId: z.uuid().optional(),
  action: z.enum(RecordAuditAction).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListAuditDto = z.infer<typeof listAuditSchema>;
export type CreateEntryDto = z.infer<typeof createEntrySchema>;
export type CancelEntryDto = z.infer<typeof cancelEntrySchema>;
export type DayRecordsDto = z.infer<typeof dayRecordsSchema>;
