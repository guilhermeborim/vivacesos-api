import { z } from 'zod';
import { PaymentMethod } from '../enums/payment-method.enum.js';

export const paymentSchema = z
  .object({
    paid: z.boolean('Informe se foi pago'),
    paymentMethod: z
      .enum(PaymentMethod, 'Forma de pagamento inválida')
      .optional(),
    paidAt: z.iso
      .datetime({
        offset: true,
        message: 'paidAt deve ser uma data/hora ISO válida',
      })
      .optional(),
  })
  .refine((v) => !v.paid || v.paymentMethod, {
    message: 'Informe a forma de pagamento',
    path: ['paymentMethod'],
  });

export type PaymentDto = z.infer<typeof paymentSchema>;

/** Campos de pagamento a gravar: pago exige método; não pago limpa método e data. */
export function buildPayment(input: PaymentDto) {
  if (!input.paid) {
    return { paid: false, paymentMethod: null, paidAt: null };
  }
  return {
    paid: true,
    paymentMethod: input.paymentMethod!,
    paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
  };
}
