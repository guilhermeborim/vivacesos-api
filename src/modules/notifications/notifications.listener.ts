import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  APPOINTMENT_CREATED,
  APPOINTMENT_STATUS_CHANGED,
  type AppointmentEvent,
  type AppointmentStatusChangedEvent,
  EXPENSE_RECURRING_CREATED,
  type ExpenseRecurringCreatedEvent,
  INTEGRATION_DISCONNECTED,
  type IntegrationDisconnectedEvent,
  INVITE_ACCEPTED,
  type InviteAcceptedEvent,
  PAYOUT_LAUNCHED,
  PAYOUT_PAID,
  type PayoutEvent,
} from '../../common/events/domain.events.js';
import { ClinicUserRole } from '../../common/enums/clinic-user-role.enum.js';
import {
  formatMoney,
  formatWhen,
  NotificationsService,
} from './notifications.service.js';

const { ADMIN, RECEPCIONISTA } = ClinicUserRole;

/**
 * Traduz eventos de domínio em avisos por papel. Falha ao avisar nunca derruba a ação
 * original (já concluída): erros são engolidos pelo `suppressErrors` do emitter.
 */
@Injectable()
export class NotificationsListener {
  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent(APPOINTMENT_CREATED, { suppressErrors: true })
  async onAppointmentCreated(e: AppointmentEvent) {
    await this.notifications.notifyUsers(
      e.clinicId,
      [e.professionalUserId],
      {
        type: 'APPOINTMENT_CREATED',
        title: 'Nova consulta agendada',
        message: `${e.patientName} — ${formatWhen(e.startsAt)}`,
        link: '/schedule',
        data: { appointmentId: e.appointmentId },
      },
      e.actorUserId ?? undefined,
    );
  }

  @OnEvent(APPOINTMENT_STATUS_CHANGED, { suppressErrors: true })
  async onAppointmentStatusChanged(e: AppointmentStatusChangedEvent) {
    const who = `${e.patientName} — ${formatWhen(e.startsAt)}`;
    const base = {
      link: '/schedule',
      data: { appointmentId: e.appointmentId },
    };

    if (e.status === 'CONFIRMADA') {
      const draft = {
        ...base,
        type: 'APPOINTMENT_CONFIRMED',
        title: 'Consulta confirmada',
        message: who,
      };
      await this.notifications.notifyRoles(
        e.clinicId,
        [RECEPCIONISTA],
        draft,
        e.actorUserId ?? undefined,
      );
      await this.notifications.notifyUsers(
        e.clinicId,
        [e.professionalUserId],
        draft,
        e.actorUserId ?? undefined,
      );
    } else if (e.status === 'CHEGOU') {
      await this.notifications.notifyUsers(
        e.clinicId,
        [e.professionalUserId],
        {
          ...base,
          link: '/medical-record/now',
          type: 'APPOINTMENT_ARRIVED',
          title: 'Paciente chegou',
          message: who,
        },
        e.actorUserId ?? undefined,
      );
    } else if (e.status === 'CONCLUIDA') {
      await this.notifications.notifyRoles(
        e.clinicId,
        [RECEPCIONISTA],
        {
          ...base,
          type: 'APPOINTMENT_COMPLETED',
          title: 'Consulta concluída',
          message: `${e.professionalName ?? 'O profissional'} concluiu a consulta de ${who}`,
        },
        e.actorUserId ?? undefined,
      );
    } else if (e.status === 'CANCELADA' || e.status === 'FALTOU') {
      const canceled = e.status === 'CANCELADA';
      await this.notifications.notifyRoles(
        e.clinicId,
        [ADMIN],
        {
          ...base,
          type: canceled ? 'APPOINTMENT_CANCELED' : 'APPOINTMENT_NO_SHOW',
          title: canceled ? 'Consulta cancelada' : 'Falta registrada',
          message: who,
        },
        e.actorUserId ?? undefined,
      );
    }
  }

  @OnEvent(PAYOUT_LAUNCHED, { suppressErrors: true })
  async onPayoutLaunched(e: PayoutEvent) {
    const draft = {
      type: 'PAYOUT_LAUNCHED',
      title: 'Repasse lançado',
      link: '/despesas',
      data: { payoutId: e.payoutId },
    };
    await this.notifications.notifyUsers(
      e.clinicId,
      [e.professionalUserId],
      {
        ...draft,
        message: `Seu repasse de ${formatMoney(e.amount)} foi lançado e aguarda pagamento.`,
      },
      e.actorUserId,
    );
    await this.notifications.notifyRoles(
      e.clinicId,
      [ADMIN],
      {
        ...draft,
        message: `Repasse de ${formatMoney(e.amount)} lançado para ${e.professionalName ?? 'o profissional'}.`,
      },
      e.actorUserId,
    );
  }

  @OnEvent(PAYOUT_PAID, { suppressErrors: true })
  async onPayoutPaid(e: PayoutEvent) {
    const draft = {
      type: 'PAYOUT_PAID',
      title: 'Repasse pago',
      link: '/despesas',
      data: { payoutId: e.payoutId },
    };
    await this.notifications.notifyUsers(
      e.clinicId,
      [e.professionalUserId],
      {
        ...draft,
        message: `Seu repasse de ${formatMoney(e.amount)} foi pago.`,
      },
      e.actorUserId,
    );
    await this.notifications.notifyRoles(
      e.clinicId,
      [ADMIN],
      {
        ...draft,
        message: `Repasse de ${formatMoney(e.amount)} pago a ${e.professionalName ?? 'o profissional'}.`,
      },
      e.actorUserId,
    );
  }

  @OnEvent(EXPENSE_RECURRING_CREATED, { suppressErrors: true })
  async onRecurringExpenseCreated(e: ExpenseRecurringCreatedEvent) {
    const [year, month, day] = e.dueDate.split('-');
    await this.notifications.notifyRoles(e.clinicId, [ADMIN], {
      type: 'EXPENSE_RECURRING_CREATED',
      title: 'Despesa recorrente criada',
      message: `${e.description} — ${formatMoney(e.amount)}, vence em ${day}/${month}/${year}`,
      link: '/despesas',
      data: { expenseId: e.expenseId },
    });
  }

  @OnEvent(INTEGRATION_DISCONNECTED, { suppressErrors: true })
  async onIntegrationDisconnected(e: IntegrationDisconnectedEvent) {
    await this.notifications.notifyRoles(e.clinicId, [ADMIN], {
      type: 'INTEGRATION_DISCONNECTED',
      title: 'Google Agenda desconectado',
      message: `${e.reason} Reconecte em Integrações → Google.`,
      link: '/google',
      dedupeKey: `integration-disconnected:${e.provider}:${new Date().toISOString().slice(0, 10)}`,
    });
  }

  @OnEvent(INVITE_ACCEPTED, { suppressErrors: true })
  async onInviteAccepted(e: InviteAcceptedEvent) {
    await this.notifications.notifyRoles(e.clinicId, [ADMIN], {
      type: 'INVITE_ACCEPTED',
      title: 'Convite aceito',
      message: `${e.userName} (${e.email}) concluiu o cadastro.`,
      link: '/users',
    });
  }
}
