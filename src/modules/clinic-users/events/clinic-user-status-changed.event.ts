import type { ClinicUserRole } from '../../../common/enums/clinic-user-role.enum.js';
import type { ClinicUserStatus } from '../../../common/enums/clinic-user-status.enum.js';

export const CLINIC_USER_STATUS_CHANGED = 'clinic-user.status-changed';

export class ClinicUserStatusChangedEvent {
  constructor(
    readonly clinicId: string,
    readonly userId: string,
    readonly role: ClinicUserRole,
    readonly status: ClinicUserStatus,
  ) {}
}
