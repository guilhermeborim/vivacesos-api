import { z } from 'zod';
import { ProfessionalType } from '../enums/professional-type.enum.js';

const fields = {
  type: z.enum(ProfessionalType).optional(),
  crm: z
    .string()
    .min(5, 'O CRM deve ter no mínimo 5 caracteres')
    .max(10, 'O CRM deve ter no máximo 10 caracteres')
    .optional(),
  specialty: z
    .string()
    .max(30, 'A especialidade deve ter no máximo 30 caracteres')
    .optional(),
};

/** Cadastro feito por um ADMIN para um usuário já vinculado à clínica ativa. */
export const registerProfessionalSchema = z.object({
  userId: z.uuid('ID do usuário inválido'),
  ...fields,
  active: z.boolean().optional(),
});

/** Onboarding: o próprio usuário se registra como profissional de uma de suas clínicas. */
export const registerProfessionalOnboardingSchema = z.object({
  clinicId: z.uuid('ID da clínica inválido'),
  ...fields,
});

export const updateProfessionalSchema = z.object({
  ...fields,
  /** Percentual padrão do repasse (0–100); `null` remove. Somente o ADMIN altera. */
  payoutPercent: z
    .number('O percentual deve ser um número')
    .min(0, 'O percentual não pode ser negativo')
    .max(100, 'O percentual deve ser no máximo 100')
    .multipleOf(0.01, 'O percentual deve ter no máximo 2 casas decimais')
    .nullable()
    .optional(),
  active: z.boolean().optional(),
});

export type RegisterProfessionalDto = z.infer<
  typeof registerProfessionalSchema
>;
export type RegisterProfessionalOnboardingDto = z.infer<
  typeof registerProfessionalOnboardingSchema
>;
export type UpdateProfessionalDto = z.infer<typeof updateProfessionalSchema>;
