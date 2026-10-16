import type { ClinicUserRole } from '../enums/clinic-user-role.enum.js';
import type { ClinicUserStatus } from '../enums/clinic-user-status.enum.js';

/**
 * Contratos consumidos pelos guards. Os módulos `users` e `clinic-users`
 * devem fornecer (providers) estes tokens.
 */
export const USER_LOOKUP = Symbol('USER_LOOKUP');
export interface UserLookup {
  findById(id: string): Promise<{ id: string } | null>;
}

export const CLINIC_USER_LOOKUP = Symbol('CLINIC_USER_LOOKUP');
export interface ClinicUserLookup {
  getUserBindedClinic(
    clinicId: string,
    userId: string,
  ): Promise<{ role: ClinicUserRole; status: ClinicUserStatus } | null>;
}
