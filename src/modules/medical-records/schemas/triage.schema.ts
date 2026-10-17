import { z } from 'zod';

const measure = (
  label: string,
  min: number,
  max: number,
  { integer = true, step }: { integer?: boolean; step?: number } = {},
) => {
  let schema = z
    .number(`${label} deve ser um número`)
    .min(min, `${label} deve ser de, no mínimo, ${min}`)
    .max(max, `${label} deve ser de, no máximo, ${max}`);
  if (integer) schema = schema.int(`${label} deve ser um número inteiro`);
  if (step)
    schema = schema.multipleOf(step, `${label}: use até 1 casa decimal`);
  return schema.nullable().default(null);
};

/** Substitui a triagem inteira; campo vazio é guardado como `null`. */
export const triageSchema = z
  .object({
    systolic: measure('A pressão sistólica', 40, 300),
    diastolic: measure('A pressão diastólica', 20, 200),
    heartRate: measure('Os batimentos', 20, 300),
    respiratoryRate: measure('A frequência respiratória', 5, 80),
    temperatureC: measure('A temperatura', 30, 45, {
      integer: false,
      step: 0.1,
    }),
    spo2: measure('A saturação', 50, 100),
    weightKg: measure('O peso', 1, 500, { integer: false, step: 0.01 }),
    heightCm: measure('A altura', 50, 260, { integer: false, step: 0.1 }),
    notes: z
      .string()
      .trim()
      .max(2000, 'Máximo de 2000 caracteres')
      .nullable()
      .default(null)
      .transform((v) => v || null),
  })
  .refine(
    (v) =>
      v.systolic === null || v.diastolic === null || v.systolic > v.diastolic,
    {
      message: 'A sistólica deve ser maior que a diastólica',
      path: ['systolic'],
    },
  );

export type TriageDto = z.infer<typeof triageSchema>;
