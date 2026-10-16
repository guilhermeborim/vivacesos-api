import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  APPOINTMENT_CREATED,
  type AppointmentEvent,
} from '../../common/events/domain.events.js';
import { CLINIC_TZ } from '../../common/utils/clinic-time.js';
import { onlyDigits } from '../../common/utils/digits.js';
import { CryptoService } from '../../security/crypto.service.js';
import { AppointmentsRepository } from '../appointments/appointments.repository.js';
import type { Appointment } from '../appointments/entities/appointment.entity.js';
import {
  AppointmentStatus,
  OPEN_APPOINTMENT_STATUSES,
} from '../appointments/enums/appointment-status.enum.js';
import {
  PATIENT_MESSAGE_CHANNEL,
  type PatientMessageChannel,
} from '../integrations/channels/patient-message-channel.js';
import { AppointmentLinkService } from './appointment-link.service.js';

const whenText = (date: Date) => {
  const d = new Date(date);
  const day = d.toLocaleDateString('pt-BR', { timeZone: CLINIC_TZ });
  const time = d.toLocaleTimeString('pt-BR', {
    timeZone: CLINIC_TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${day} às ${time}`;
};

/** Número do WhatsApp com DDI: assume Brasil (55) quando vier só DDD + número. */
const toWhatsappNumber = (digits: string) =>
  digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;

@Injectable()
export class PatientMessagesService {
  private readonly logger = new Logger(PatientMessagesService.name);
  private readonly phoneCrypto;

  constructor(
    private readonly appointments: AppointmentsRepository,
    private readonly links: AppointmentLinkService,
    @Inject(PATIENT_MESSAGE_CHANNEL)
    private readonly channel: PatientMessageChannel,
    crypto: CryptoService,
  ) {
    this.phoneCrypto = crypto.forField('patient:phone');
  }

  /** Monta a mensagem (e o link do WhatsApp) para a recepcionista enviar. */
  async compose(clinicId: string, appointmentId: string) {
    const appointment = await this.appointments.findDetailed(
      appointmentId,
      clinicId,
    );
    if (!appointment) throw new NotFoundException('Consulta não encontrada!');
    if (!OPEN_APPOINTMENT_STATUSES.includes(appointment.status)) {
      throw new ConflictException(
        `Não há mensagem para uma consulta ${appointment.status}!`,
      );
    }
    return this.build(appointment);
  }

  private build(appointment: Appointment) {
    const phone = onlyDigits(
      this.phoneCrypto.decrypt(appointment.patient.phone),
    );
    if (!phone)
      throw new ConflictException('O paciente não tem telefone cadastrado!');

    const link = this.links.url(
      this.links.create(appointment.id, appointment.startsAt),
    );
    const firstName = appointment.patient.name.split(' ')[0];
    const professional =
      appointment.professional.user?.name ?? 'o profissional';
    const confirmed = appointment.status === AppointmentStatus.CONFIRMADA;

    const text = [
      `Olá, ${firstName}!`,
      '',
      confirmed
        ? `Lembrete: sua consulta com ${professional} está confirmada para ${whenText(appointment.startsAt)} na ${appointment.clinic.name}.`
        : `Sua consulta com ${professional} foi agendada para ${whenText(appointment.startsAt)} na ${appointment.clinic.name}.`,
      '',
      confirmed
        ? `Se não puder comparecer, cancele por aqui: ${link}`
        : `Para confirmar ou cancelar, acesse: ${link}`,
      '',
      '_Esta é uma mensagem automática, por favor não responda._',
    ].join('\n');

    return {
      phone,
      text,
      link,
      whatsappUrl: `https://wa.me/${toWhatsappNumber(phone)}?text=${encodeURIComponent(text)}`,
      automatic: this.channel.automatic,
    };
  }

  /** Canal automático (futuro: Z-API) envia sozinho ao agendar; o manual não faz nada. */
  @OnEvent(APPOINTMENT_CREATED, { suppressErrors: true })
  async onAppointmentCreated(event: AppointmentEvent) {
    if (!this.channel.automatic) return;
    try {
      const appointment = await this.appointments.findDetailed(
        event.appointmentId,
        event.clinicId,
      );
      if (!appointment) return;
      const message = this.build(appointment);
      await this.channel.send(event.clinicId, message.phone, message.text);
    } catch (error) {
      this.logger.error('Falha ao enviar mensagem automática', error);
    }
  }
}
