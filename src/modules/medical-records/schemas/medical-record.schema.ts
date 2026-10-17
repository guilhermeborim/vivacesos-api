import { z } from 'zod';
import { RecordAuditAction } from '../enums/record-audit-action.enum.js';

const content = z
  .string('O conteúdo é obrigatório')
  .trim()
  .min(1, 'O conteúdo é obrigatório')
  .max(20000, 'O conteúdo deve ter no máximo 20000 caracteres');

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres`)
    .optional()
    .transform((v) => v || undefined);

export const prescriptionSchema = z.object({
  medication: z
    .string('O medicamento é obrigatório')
    .trim()
    .min(1, 'O medicamento é obrigatório')
    .max(200, 'O medicamento deve ter no máximo 200 caracteres'),
  dose: optionalText(50),
  unit: optionalText(30),
  /** Ex.: "8/8 horas", "1x ao dia". */
  frequency: optionalText(100),
  /** Ex.: "7 dias", "uso contínuo". */
  duration: optionalText(100),
  instructions: optionalText(500),
});

export const examRequestSchema = z.object({
  name: z
    .string('O exame é obrigatório')
    .trim()
    .min(1, 'O exame é obrigatório')
    .max(200, 'O exame deve ter no máximo 200 caracteres'),
  notes: optionalText(500),
});

export const certificateSchema = z.object({
  /** Dias de afastamento; vazio = atestado de comparecimento. */
  days: z
    .number('Os dias devem ser um número')
    .int('Os dias devem ser inteiros')
    .min(1, 'Informe ao menos 1 dia')
    .max(365, 'Máximo de 365 dias')
    .optional(),
  /** CID-10 (ex.: J00, A09.0); opcional. */
  cid: z
    .string()
    .trim()
    .toUpperCase()
    .max(10, 'O CID deve ter no máximo 10 caracteres')
    .optional()
    .transform((v) => v || undefined),
  text: z
    .string('O texto do atestado é obrigatório')
    .trim()
    .min(1, 'O texto do atestado é obrigatório')
    .max(2000, 'O texto deve ter no máximo 2000 caracteres'),
});

export const referralSchema = z.object({
  specialty: z
    .string('A especialidade é obrigatória')
    .trim()
    .min(1, 'A especialidade é obrigatória')
    .max(100, 'A especialidade deve ter no máximo 100 caracteres'),
  reason: optionalText(1000),
});

export type CertificateDto = z.infer<typeof certificateSchema>;
export type ReferralDto = z.infer<typeof referralSchema>;
export type PrescriptionDto = z.infer<typeof prescriptionSchema>;
export type ExamRequestDto = z.infer<typeof examRequestSchema>;

/** Ficha nova de uma consulta, com prescrições, exames, atestados e encaminhamentos. */
export const createEntrySchema = z.object({
  appointmentId: z.uuid('Selecione a consulta'),
  content,
  prescriptions: z.array(prescriptionSchema).max(30).default([]),
  exams: z.array(examRequestSchema).max(30).default([]),
  certificates: z.array(certificateSchema).max(10).default([]),
  referrals: z.array(referralSchema).max(10).default([]),
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
