import { z } from 'zod';
import { ClinicUserStatus } from '../../../common/enums/clinic-user-status.enum.js';

export const ALLOWED_TRANSITIONS: Record<ClinicUserStatus, ClinicUserStatus[]> =
  {
    [ClinicUserStatus.ATIVO]: [
      ClinicUserStatus.INATIVO,
      ClinicUserStatus.BLOQUEADO,
    ],
    [ClinicUserStatus.INATIVO]: [ClinicUserStatus.ATIVO],
    [ClinicUserStatus.BLOQUEADO]: [
      ClinicUserStatus.ATIVO,
      ClinicUserStatus.INATIVO,
    ],
    [ClinicUserStatus.INVITADO]: [ClinicUserStatus.INATIVO],
  };

export const updateStatusSchema = z.object({
  status: z.enum(ClinicUserStatus),
});

export type UpdateStatusDto = z.infer<typeof updateStatusSchema>;
