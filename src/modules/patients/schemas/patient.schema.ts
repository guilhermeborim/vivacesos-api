import { z } from 'zod';

const cpf = z
  .string('O CPF é obrigatório')
  .min(11, 'O CPF deve conter 11 caracteres')
  .max(14, 'O CPF deve conter 14 caracteres');

const phone = z
  .string('O Telefone é obrigatório')
  .min(11, 'O Telefone deve ter no mínimo 11 caracteres')
  .max(15, 'O Telefone deve ter no máximo 15 caracteres');

export const registerPatientSchema = z.object({
  name: z.string('O nome é obrigatório').min(1, 'O nome é obrigatório'),
  email: z.email('O email deve ser válido'),
  cpf,
  phone,
  birthDate: z.iso.date('A data de aniversário é obrigatória'),
  active: z.boolean().optional(),
});

export const updatePatientSchema = registerPatientSchema.partial();

export type RegisterPatientDto = z.infer<typeof registerPatientSchema>;
export type UpdatePatientDto = z.infer<typeof updatePatientSchema>;
