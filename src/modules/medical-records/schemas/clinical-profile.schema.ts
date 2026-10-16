import { z } from 'zod';

export const DIABETES_VALUES = ['SIM', 'NAO', 'NA'] as const;

const text = z.string().trim().max(2000, 'Máximo de 2000 caracteres');

/** Substitui o perfil inteiro; campo vazio é guardado como `null`. */
export const clinicalProfileSchema = z.object({
  heightCm: z
    .number('A altura deve ser um número')
    .min(50, 'A altura deve ser de, no mínimo, 50 cm')
    .max(260, 'A altura deve ser de, no máximo, 260 cm')
    .multipleOf(0.1, 'A altura deve ter no máximo 1 casa decimal')
    .nullable()
    .default(null),
  weightKg: z
    .number('O peso deve ser um número')
    .min(1, 'O peso deve ser de, no mínimo, 1 kg')
    .max(500, 'O peso deve ser de, no máximo, 500 kg')
    .multipleOf(0.01, 'O peso deve ter no máximo 2 casas decimais')
    .nullable()
    .default(null),
  diabetes: z.enum(DIABETES_VALUES, 'Valor inválido').nullable().default(null),
  drugAllergies: text
    .nullable()
    .default(null)
    .transform((v) => v || null),
  otherInfo: text
    .nullable()
    .default(null)
    .transform((v) => v || null),
});

export type ClinicalProfileDto = z.infer<typeof clinicalProfileSchema>;
