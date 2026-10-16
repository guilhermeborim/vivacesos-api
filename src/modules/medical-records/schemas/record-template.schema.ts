import { z } from 'zod';

export const createTemplateSchema = z.object({
  name: z
    .string('O nome é obrigatório')
    .trim()
    .min(1, 'O nome é obrigatório')
    .max(100, 'O nome deve ter no máximo 100 caracteres'),
  content: z
    .string('O conteúdo é obrigatório')
    .trim()
    .min(1, 'O conteúdo é obrigatório')
    .max(20000, 'O conteúdo deve ter no máximo 20000 caracteres'),
});

export const updateTemplateSchema = createTemplateSchema.partial();

export type CreateTemplateDto = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateDto = z.infer<typeof updateTemplateSchema>;
