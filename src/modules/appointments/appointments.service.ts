import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  APPOINTMENT_CREATED,
  APPOINTMENT_RESCHEDULED,
  APPOINTMENT_STATUS_CHANGED,
} from '../../common/events/domain.events.js';
import {
  buildPayment,
  type PaymentDto,
} from '../../common/schemas/payment.schema.js';
import { zonedToUtc } from '../../common/utils/clinic-time.js';
import {
  freeSlots,
  isWithinAvailability,
} from '../professionals/availability.js';
import { AvailabilityRepository } from '../professionals/availability.repository.js';
import { PatientsRepository } from '../patients/patients.repository.js';
import { ProfessionalsRepository } from '../professionals/professionals.repository.js';
import { AppointmentsRepository } from './appointments.repository.js';
import type { Appointment } from './entities/appointment.entity.js';
import {
  AppointmentStatus,
  BILLABLE_APPOINTMENT_STATUSES,
  OPEN_APPOINTMENT_STATUSES,
} from './enums/appointment-status.enum.js';
import type {
  ListAppointmentsDto,
  RegisterAppointmentDto,
  SlotsQueryDto,
  UpdateAppointmentDto,
  UpdateAppointmentStatusDto,
} from './schemas/appointment.schema.js';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly appointments: AppointmentsRepository,
    private readonly patients: PatientsRepository,
    private readonly professionals: ProfessionalsRepository,
    private readonly events: EventEmitter2,
    private readonly availability: AvailabilityRepository,
  ) {}

  async register(
    clinicId: string,
    actorUserId: string,
    input: RegisterAppointmentDto,
  ) {
    const patient = await this.patients.findById(clinicId, input.patientId);
    if (!patient) throw new NotFoundException('Paciente não encontrado!');
    if (!patient.active) {
      throw new BadRequestException('Paciente inativo!');
    }

    const professional = await this.professionals.findById(
      clinicId,
      input.professionalId,
    );
    if (!professional) {
      throw new NotFoundException('Profissional não encontrado!');
    }
    if (!professional.active) {
      throw new BadRequestException('Profissional inativo!');
    }

    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    await this.assertNoConflict(clinicId, professional.id, startsAt, endsAt);
    await this.assertWithinAvailability(professional, startsAt, endsAt);

    const created = await this.appointments.create({
      clinicId,
      patientId: patient.id,
      professionalId: professional.id,
      startsAt,
      endsAt,
      price: input.price,
      notes: input.notes,
    });
    await this.events.emitAsync(APPOINTMENT_CREATED, {
      clinicId,
      appointmentId: created.id,
      professionalUserId: professional.userId,
      professionalName: created.professional.user?.name ?? null,
      patientName: patient.name,
      startsAt,
      actorUserId,
    });
    return this.toResponse(created);
  }

  async findByClinic(clinicId: string, filters: ListAppointmentsDto) {
    const list = await this.appointments.findByClinic(clinicId, {
      ...filters,
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
    });
    return list.map((a) => this.toResponse(a));
  }

  async findById(clinicId: string, id: string) {
    return this.toResponse(await this.getOrFail(clinicId, id));
  }

  async update(clinicId: string, id: string, input: UpdateAppointmentDto) {
    const appointment = await this.getOrFail(clinicId, id);

    const changesBilling = input.price !== undefined;
    const changesSchedule =
      input.notes !== undefined || !!input.startsAt || !!input.endsAt;
    if (changesSchedule) this.assertOpen(appointment);
    if (changesBilling) this.assertBillable(appointment);
    if (changesBilling) this.assertNotPaidOut(appointment);
    if (
      changesBilling &&
      appointment.status === AppointmentStatus.CONCLUIDA &&
      appointment.paid
    ) {
      throw new ConflictException(
        'O valor de uma consulta concluída e paga não pode ser alterado!',
      );
    }

    const data: Partial<Appointment> = {};
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.price !== undefined) data.price = input.price;

    if (input.startsAt || input.endsAt) {
      const startsAt = input.startsAt
        ? new Date(input.startsAt)
        : appointment.startsAt;
      const endsAt = input.endsAt ? new Date(input.endsAt) : appointment.endsAt;
      if (endsAt <= startsAt) {
        throw new BadRequestException('O fim deve ser depois do início!');
      }
      await this.assertNoConflict(
        clinicId,
        appointment.professionalId,
        startsAt,
        endsAt,
        id,
      );
      await this.assertWithinAvailability(
        appointment.professional,
        startsAt,
        endsAt,
      );
      data.startsAt = startsAt;
      data.endsAt = endsAt;
    }

    await this.appointments.update(id, data);
    if (data.startsAt) {
      await this.events.emitAsync(APPOINTMENT_RESCHEDULED, {
        clinicId,
        appointmentId: id,
      });
    }
  }

  async updateStatus(
    clinicId: string,
    actorUserId: string | null,
    id: string,
    { status }: UpdateAppointmentStatusDto,
  ) {
    const appointment = await this.getOrFail(clinicId, id);
    this.assertOpen(appointment);
    if (
      status === AppointmentStatus.CANCELADA ||
      status === AppointmentStatus.FALTOU
    ) {
      this.assertNotPaidOut(appointment);
    }
    if (status === AppointmentStatus.AGENDADA) {
      throw new BadRequestException('Não é possível voltar para AGENDADA!');
    }
    await this.appointments.update(id, { status });
    await this.events.emitAsync(APPOINTMENT_STATUS_CHANGED, {
      clinicId,
      appointmentId: id,
      status,
      professionalUserId: appointment.professional.userId,
      professionalName: appointment.professional.user?.name ?? null,
      patientName: appointment.patient.name,
      startsAt: appointment.startsAt,
      actorUserId,
    });
  }

  async updatePayment(clinicId: string, id: string, input: PaymentDto) {
    const appointment = await this.getOrFail(clinicId, id);
    this.assertBillable(appointment);
    this.assertNotPaidOut(appointment);
    await this.appointments.update(id, buildPayment(input));
  }

  /** Consulta incluída num repasse não muda de valor nem de pagamento (senão o repasse fica errado). */
  private assertNotPaidOut(appointment: Appointment) {
    if (appointment.payoutId) {
      throw new ConflictException(
        'Esta consulta já foi repassada ao profissional. Desfaça o repasse para alterá-la!',
      );
    }
  }

  private assertBillable(appointment: Appointment) {
    if (!BILLABLE_APPOINTMENT_STATUSES.includes(appointment.status)) {
      throw new ConflictException(
        `Valor e pagamento de consulta ${appointment.status} não podem ser alterados!`,
      );
    }
  }

  private assertOpen(appointment: Appointment) {
    if (!OPEN_APPOINTMENT_STATUSES.includes(appointment.status)) {
      throw new ConflictException(
        `Consulta ${appointment.status} não pode ser alterada!`,
      );
    }
  }

  /** Profissional com horários restritos só atende dentro das faixas dele (fuso da clínica). */
  private async assertWithinAvailability(
    professional: { id: string; availabilityRestricted: boolean },
    startsAt: Date,
    endsAt: Date,
  ) {
    if (!professional.availabilityRestricted) return;
    const ranges = await this.availability.findRanges(professional.id);
    if (!isWithinAvailability(ranges, startsAt, endsAt)) {
      throw new ConflictException(
        'Fora do horário de atendimento do profissional!',
      );
    }
  }

  /** Horas livres do profissional numa data (só faz sentido para quem tem horários restritos). */
  async slots(clinicId: string, input: SlotsQueryDto) {
    const professional = await this.professionals.findById(
      clinicId,
      input.professionalId,
    );
    if (!professional) {
      throw new NotFoundException('Profissional não encontrado!');
    }
    if (!professional.availabilityRestricted) {
      return { restricted: false, slots: [] };
    }

    const ranges = await this.availability.findRanges(professional.id);
    const dayStart = zonedToUtc(input.date, 0);
    const dayEnd = zonedToUtc(input.date, 1440);
    const booked = await this.appointments.findByClinic(clinicId, {
      professionalId: professional.id,
      from: dayStart,
      to: dayEnd,
    });
    const busy = booked.filter((a) =>
      OPEN_APPOINTMENT_STATUSES.includes(a.status),
    );
    return { restricted: true, slots: freeSlots(input.date, ranges, busy) };
  }

  private async assertNoConflict(
    clinicId: string,
    professionalId: string,
    startsAt: Date,
    endsAt: Date,
    exceptId?: string,
  ) {
    const conflict = await this.appointments.findConflict(
      clinicId,
      professionalId,
      startsAt,
      endsAt,
      exceptId,
    );
    if (conflict) {
      throw new ConflictException(
        'O profissional já tem uma consulta neste horário!',
      );
    }
  }

  private async getOrFail(clinicId: string, id: string) {
    const appointment = await this.appointments.findById(clinicId, id);
    if (!appointment) throw new NotFoundException('Consulta não encontrada!');
    return appointment;
  }

  private toResponse(a: Appointment) {
    return {
      clinicId: a.clinicId,
      appointment: {
        appointmentId: a.id,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        status: a.status,
        price: a.price,
        paid: a.paid,
        paidAt: a.paidAt,
        paymentMethod: a.paymentMethod,
        payoutId: a.payoutId,
        notes: a.notes,
        patient: { patientId: a.patientId, name: a.patient.name },
        professional: {
          professionalId: a.professionalId,
          name: a.professional.user?.name ?? null,
          specialty: a.professional.specialty,
        },
      },
    };
  }
}
