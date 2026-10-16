import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('E-mail deve ser válido!'),
  password: z
    .string('A senha é obrigatória')
    .min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

export type LoginDto = z.infer<typeof loginSchema>;
