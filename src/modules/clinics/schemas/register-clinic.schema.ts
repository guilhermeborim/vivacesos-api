import { z } from 'zod';

export const registerClinicSchema = z.object({
  name: z.string('O Nome é obrigatório').min(1, 'O Nome é obrigatório'),
  cnpj: z
    .string('O CNPJ é obrigatório')
    .min(14, 'O CNPJ deve ter no mínimo 14 caracteres')
    .max(18, 'O CNPJ deve ter no máximo 18 caracteres'),
  phone: z
    .string('O Telefone é obrigatório')
    .min(11, 'O Telefone deve ter no mínimo 11 caracteres')
    .max(15, 'O Telefone deve ter no máximo 15 caracteres'),
  cep: z
    .string('O CEP é obrigatório')
    .min(8, 'O CEP deve ter no mínimo 8 caracteres')
    .max(9, 'O CEP deve ter no máximo 9 caracteres'),
  number: z.string('O Número é obrigatório'),
  complement: z.string().optional(),
  road: z.string('A Rua é obrigatória'),
  neighborhood: z.string('O Bairro é obrigatório'),
  city: z.string('A Cidade é obrigatória'),
});

export type RegisterClinicDto = z.infer<typeof registerClinicSchema>;
