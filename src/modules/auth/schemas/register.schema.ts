import { z } from 'zod';
import { ProfessionalType } from '../../professionals/enums/professional-type.enum.js';

export const registerSchema = z.object({
  name: z.string('O nome é obrigatório!').min(1, 'O nome é obrigatório!'),
  email: z.email('E-mail deve ser válido!'),
  password: z
    .string('A senha é obrigatória!')
    .min(6, 'A senha deve ter no mínimo 6 caracteres!'),
  inviteToken: z.string().optional(),
  /** Perfil de profissional criado junto com o cadastro de um convite (obrigatório para PROFISSIONAL). */
  professional: z
    .object({
      type: z.enum(ProfessionalType).optional(),
      crm: z
        .string('O CRM é obrigatório!')
        .min(5, 'O CRM deve ter no mínimo 5 caracteres!')
        .max(10, 'O CRM deve ter no máximo 10 caracteres!'),
      specialty: z
        .string('A especialidade é obrigatória!')
        .min(1, 'A especialidade é obrigatória!')
        .max(30, 'A especialidade deve ter no máximo 30 caracteres!'),
    })
    .optional(),
});

export type RegisterDto = z.infer<typeof registerSchema>;
