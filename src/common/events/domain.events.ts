/**
 * Eventos de domínio que geram notificações. Só dados primitivos (a `common` não importa
 * de `modules`) e nada de conteúdo clínico: apenas nomes e horários.
 */
export const APPOINTMENT_CREATED = 'appointment.created';
export const APPOINTMENT_STATUS_CHANGED = 'appointment.status-changed';
export const PAYOUT_LAUNCHED = 'payout.launched';
export const PAYOUT_PAID = 'payout.paid';
export const INVITE_ACCEPTED = 'invite.accepted';

export interface AppointmentEvent {
  clinicId: string;
  appointmentId: string;
  /** Usuário (login) do profissional da consulta. */
  professionalUserId: string | null;
  professionalName: string | null;
  patientName: string;
  startsAt: Date;
  /** Quem causou o evento; não recebe o próprio aviso. `null` = ação do paciente pelo link. */
  actorUserId: string | null;
}

export interface AppointmentStatusChangedEvent extends AppointmentEvent {
  status: string;
}

export interface PayoutEvent {
  clinicId: string;
  payoutId: string;
  professionalUserId: string | null;
  professionalName: string | null;
  amount: number;
  actorUserId: string;
}

export interface InviteAcceptedEvent {
  clinicId: string;
  userName: string;
  email: string;
}

export const EXPENSE_RECURRING_CREATED = 'expense.recurring-created';

export interface ExpenseRecurringCreatedEvent {
  clinicId: string;
  expenseId: string;
  description: string;
  amount: number;
  dueDate: string;
}

export const CLINIC_RECURRING_ENABLED = 'clinic.recurring-enabled';

export interface ClinicRecurringEnabledEvent {
  clinicId: string;
}

export const APPOINTMENT_RESCHEDULED = 'appointment.rescheduled';

export interface AppointmentRescheduledEvent {
  clinicId: string;
  appointmentId: string;
}

export const INTEGRATION_DISCONNECTED = 'integration.disconnected';

export interface IntegrationDisconnectedEvent {
  clinicId: string;
  provider: 'GOOGLE_CALENDAR' | 'WHATSAPP';
  reason: string;
}
