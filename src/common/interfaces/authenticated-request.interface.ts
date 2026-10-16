import type { Request } from 'express';
import type { ClinicUserRole } from '../enums/clinic-user-role.enum.js';

export interface AuthenticatedRequest extends Request {
  user: { id: string };
  clinicId?: string;
  userRole?: ClinicUserRole;
}
