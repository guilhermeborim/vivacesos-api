import { z } from 'zod';
import { ClinicUserRole } from '../../../common/enums/clinic-user-role.enum.js';

export const createInviteSchema = z.object({
  email: z.email('E-mail deve ser válido!'),
  role: z.enum(ClinicUserRole, 'O papel é obrigatório'),
});

export type CreateInviteDto = z.infer<typeof createInviteSchema>;
