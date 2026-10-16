import {
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentsRepository } from '../appointments/appointments.repository.js';
import { AppointmentsService } from '../appointments/appointments.service.js';
import type { Appointment } from '../appointments/entities/appointment.entity.js';
import {
  AppointmentStatus,
  OPEN_APPOINTMENT_STATUSES,
} from '../appointments/enums/appointment-status.enum.js';
import { AppointmentLinkService } from './appointment-link.service.js';

/** Ações do paciente pelo link público. Mostra o mínimo: nada de dado clínico ou financeiro. */
@Injectable()
export class PublicAppointmentsService {
  constructor(
    private readonly appointments: AppointmentsRepository,
    private readonly appointmentsService: AppointmentsService,
    private readonly links: AppointmentLinkService,
  ) {}

  async view(token: string) {
    return this.toView(await this.resolve(token));
  }

  async confirm(token: string) {
    const appointment = await this.resolve(token);
    if (appointment.status === AppointmentStatus.CONFIRMADA) {
      return {
        ...this.toView(appointment),
        message: 'Consulta já estava confirmada.',
      };
    }
    if (appointment.status !== AppointmentStatus.AGENDADA) {
      throw new ConflictException(
        'Esta consulta não pode mais ser confirmada.',
      );
    }
    await this.appointmentsService.updateStatus(
      appointment.clinicId,
      null,
      appointment.id,
      { status: AppointmentStatus.CONFIRMADA },
    );
    return this.after(appointment.id, 'Consulta confirmada com sucesso!');
  }

  async cancel(token: string) {
    const appointment = await this.resolve(token);
    if (appointment.status === AppointmentStatus.CANCELADA) {
      return {
        ...this.toView(appointment),
        message: 'Consulta já estava cancelada.',
      };
    }
    if (!OPEN_APPOINTMENT_STATUSES.includes(appointment.status)) {
      throw new ConflictException('Esta consulta não pode mais ser cancelada.');
    }
    await this.appointmentsService.updateStatus(
      appointment.clinicId,
      null,
      appointment.id,
      { status: AppointmentStatus.CANCELADA },
    );
    return this.after(appointment.id, 'Consulta cancelada com sucesso!');
  }

  private async after(id: string, message: string) {
    const fresh = await this.appointments.findDetailed(id);
    return { ...this.toView(fresh!), message };
  }

  /** Token válido (assinatura confere com o início atual) e consulta ainda no futuro. */
  private async resolve(token: string) {
    const parsed = this.links.parseId(token);
    const appointment = parsed
      ? await this.appointments.findDetailed(parsed.id)
      : null;
    if (!appointment || !this.links.verify(token, appointment)) {
      throw new NotFoundException('Link inválido ou desatualizado.');
    }
    if (appointment.startsAt <= new Date()) {
      throw new GoneException('Este link expirou: a consulta já começou.');
    }
    return appointment;
  }

  private toView(a: Appointment) {
    return {
      clinicName: a.clinic.name,
      professionalName: a.professional.user?.name ?? null,
      patientFirstName: a.patient.name.split(' ')[0],
      startsAt: a.startsAt,
      status: a.status,
      canConfirm: a.status === AppointmentStatus.AGENDADA,
      canCancel: OPEN_APPOINTMENT_STATUSES.includes(a.status),
    };
  }
}
