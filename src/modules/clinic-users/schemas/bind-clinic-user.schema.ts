import { z } from 'zod';
import { ClinicUserRole } from '../../../common/enums/clinic-user-role.enum.js';
import { ClinicUserStatus } from '../../../common/enums/clinic-user-status.enum.js';

export const bindClinicUserSchema = z.object({
  userId: z.uuid('O ID do usuário é obrigatório'),
  role: z.enum(ClinicUserRole, 'O papel é obrigatório'),
  status: z.enum(ClinicUserStatus).optional(),
});

export type BindClinicUserDto = z.infer<typeof bindClinicUserSchema>;
