import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import {
  APPOINTMENT_CREATED,
  APPOINTMENT_RESCHEDULED,
  APPOINTMENT_STATUS_CHANGED,
  type AppointmentEvent,
  type AppointmentRescheduledEvent,
} from '../../../common/events/domain.events.js';
import { GoogleCalendarService } from './google-calendar.service.js';

/** Espelha as consultas na Google Agenda (uma via: sistema → Google). Falha nunca derruba a ação original. */
@Injectable()
export class GoogleCalendarListener {
  constructor(private readonly google: GoogleCalendarService) {}

  @OnEvent(APPOINTMENT_CREATED, { suppressErrors: true })
  onCreated(e: AppointmentEvent) {
    return this.google.requestSync(e.clinicId, e.appointmentId);
  }

  @OnEvent(APPOINTMENT_STATUS_CHANGED, { suppressErrors: true })
  onStatusChanged(e: AppointmentEvent) {
    return this.google.requestSync(e.clinicId, e.appointmentId);
  }

  @OnEvent(APPOINTMENT_RESCHEDULED, { suppressErrors: true })
  onRescheduled(e: AppointmentRescheduledEvent) {
    return this.google.requestSync(e.clinicId, e.appointmentId);
  }

  /** A cada 10 minutos tenta de novo o que ficou pendente. */
  @Cron('0 */10 * * * *', { name: 'google-calendar-retry' })
  retryPending() {
    return this.google.processPending();
  }
}
