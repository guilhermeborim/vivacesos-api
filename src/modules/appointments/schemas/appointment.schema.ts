import { z } from 'zod';
import { AppointmentStatus } from '../enums/appointment-status.enum.js';

const price = z
  .number('O valor deve ser um número')
  .min(0, 'O valor não pode ser negativo')
  .max(99999999.99, 'Valor muito alto')
  .multipleOf(0.01, 'O valor deve ter no máximo 2 casas decimais');

const datetime = (message: string) => z.iso.datetime({ offset: true, message });

export const registerAppointmentSchema = z
  .object({
    patientId: z.uuid('O paciente é obrigatório'),
    professionalId: z.uuid('O profissional é obrigatório'),
    startsAt: datetime('O início deve ser uma data/hora ISO válida'),
    endsAt: datetime('O fim deve ser uma data/hora ISO válida'),
    price,
    notes: z.string().max(2000).optional(),
  })
  .refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
    message: 'O fim deve ser depois do início',
    path: ['endsAt'],
  });

export const updateAppointmentSchema = z.object({
  startsAt: datetime('O início deve ser uma data/hora ISO válida').optional(),
  endsAt: datetime('O fim deve ser uma data/hora ISO válida').optional(),
  price: price.optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(AppointmentStatus, 'Status inválido'),
});

export const listAppointmentsSchema = z.object({
  from: datetime('from deve ser uma data/hora ISO válida').optional(),
  to: datetime('to deve ser uma data/hora ISO válida').optional(),
  professionalId: z.uuid().optional(),
  patientId: z.uuid().optional(),
  status: z.enum(AppointmentStatus).optional(),
});

export const slotsQuerySchema = z.object({
  professionalId: z.uuid('O profissional é obrigatório'),
  date: z.iso.date('date deve ser uma data (AAAA-MM-DD)'),
});

export type SlotsQueryDto = z.infer<typeof slotsQuerySchema>;
export type RegisterAppointmentDto = z.infer<typeof registerAppointmentSchema>;
export type UpdateAppointmentDto = z.infer<typeof updateAppointmentSchema>;
export type UpdateAppointmentStatusDto = z.infer<
  typeof updateAppointmentStatusSchema
>;
export type ListAppointmentsDto = z.infer<typeof listAppointmentsSchema>;
