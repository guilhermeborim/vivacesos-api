export enum AppointmentStatus {
  AGENDADA = 'AGENDADA',
  CONFIRMADA = 'CONFIRMADA',
  CHEGOU = 'CHEGOU',
  CONCLUIDA = 'CONCLUIDA',
  CANCELADA = 'CANCELADA',
  FALTOU = 'FALTOU',
}

/** Consultas nestes status ainda ocupam a agenda e podem ser alteradas. */
export const OPEN_APPOINTMENT_STATUSES = [
  AppointmentStatus.AGENDADA,
  AppointmentStatus.CONFIRMADA,
  AppointmentStatus.CHEGOU,
];

/** Ocupam o horário do profissional: as em aberto e a já concluída (aconteceu, o horário não volta). */
export const OCCUPYING_APPOINTMENT_STATUSES = [
  ...OPEN_APPOINTMENT_STATUSES,
  AppointmentStatus.CONCLUIDA,
];

/** Antes da chegada: ainda dá para reagendar, e o paciente pode confirmar/cancelar pelo link. */
export const PRE_ARRIVAL_APPOINTMENT_STATUSES = [
  AppointmentStatus.AGENDADA,
  AppointmentStatus.CONFIRMADA,
];

/** Consultas nestes status ainda podem ter valor e pagamento alterados. */
export const BILLABLE_APPOINTMENT_STATUSES = [
  AppointmentStatus.AGENDADA,
  AppointmentStatus.CONFIRMADA,
  AppointmentStatus.CHEGOU,
  AppointmentStatus.CONCLUIDA,
];

/** Consultas confirmadas ou com o paciente já na clínica podem receber ficha. */
export const RECORDABLE_APPOINTMENT_STATUSES = [
  AppointmentStatus.CONFIRMADA,
  AppointmentStatus.CHEGOU,
];
