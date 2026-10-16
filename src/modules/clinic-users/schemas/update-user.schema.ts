import { z } from 'zod';

export const updateUserSchema = z.object({
  name: z.string().min(1, 'O nome deve ter no mínimo 1 caractere').optional(),
  active: z.boolean().optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
