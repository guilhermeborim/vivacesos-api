export enum AppointmentStatus {
  AGENDADA = 'AGENDADA',
  CONFIRMADA = 'CONFIRMADA',
  CONCLUIDA = 'CONCLUIDA',
  CANCELADA = 'CANCELADA',
  FALTOU = 'FALTOU',
}

/** Consultas nestes status ainda ocupam a agenda e podem ser alteradas. */
export const OPEN_APPOINTMENT_STATUSES = [
  AppointmentStatus.AGENDADA,
  AppointmentStatus.CONFIRMADA,
];

/** Consultas nestes status ainda podem ter valor e pagamento alterados. */
export const BILLABLE_APPOINTMENT_STATUSES = [
  AppointmentStatus.AGENDADA,
  AppointmentStatus.CONFIRMADA,
  AppointmentStatus.CONCLUIDA,
];

/** Somente consultas confirmadas podem receber ficha no prontuário. */
export const RECORDABLE_APPOINTMENT_STATUSES = [AppointmentStatus.CONFIRMADA];
