import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  type FindOptionsWhere,
  In,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import { Appointment } from './entities/appointment.entity.js';
import {
  type AppointmentStatus,
  OPEN_APPOINTMENT_STATUSES,
} from './enums/appointment-status.enum.js';

export interface NewAppointment {
  clinicId: string;
  patientId: string;
  professionalId: string;
  startsAt: Date;
  endsAt: Date;
  price: number;
  notes?: string;
}

export interface AppointmentFilters {
  from?: Date;
  to?: Date;
  professionalId?: string;
  patientId?: string;
  status?: AppointmentStatus;
}

const RELATIONS = { patient: true, professional: { user: true } } as const;

/** Todas as consultas são escopadas por clínica (multi-tenant). */
@Injectable()
export class AppointmentsRepository {
  constructor(
    @InjectRepository(Appointment)
    private readonly repository: Repository<Appointment>,
  ) {}

  async create(appointment: NewAppointment) {
    const saved = await this.repository.save(appointment);
    return this.repository.findOneOrFail({
      where: { id: saved.id },
      relations: RELATIONS,
    });
  }

  findByClinic(clinicId: string, filters: AppointmentFilters = {}) {
    const { from, to, professionalId, patientId, status } = filters;
    const where: FindOptionsWhere<Appointment> = {
      clinicId,
      ...(professionalId && { professionalId }),
      ...(patientId && { patientId }),
      ...(status && { status }),
      ...(from && { endsAt: MoreThanOrEqual(from) }),
      ...(to && { startsAt: LessThanOrEqual(to) }),
    };
    return this.repository.find({
      where,
      relations: RELATIONS,
      order: { startsAt: 'ASC' },
    });
  }

  /**
   * Consulta com clínica, sem escopo de clínica: só use depois de provar que o chamador tem
   * direito à consulta (ex.: token assinado do link público).
   */
  findDetailed(id: string, clinicId?: string) {
    return this.repository.findOne({
      where: { id, ...(clinicId && { clinicId }) },
      relations: { ...RELATIONS, clinic: true },
    });
  }

  findById(clinicId: string, id: string) {
    return this.repository.findOne({
      where: { clinicId, id },
      relations: RELATIONS,
    });
  }

  /** Consulta em aberto do profissional que cruza o intervalo [startsAt, endsAt). */
  findConflict(
    clinicId: string,
    professionalId: string,
    startsAt: Date,
    endsAt: Date,
    exceptId?: string,
  ) {
    return this.repository.findOne({
      where: {
        clinicId,
        professionalId,
        status: In(OPEN_APPOINTMENT_STATUSES),
        startsAt: LessThan(endsAt),
        endsAt: MoreThan(startsAt),
        ...(exceptId && { id: Not(exceptId) }),
      },
    });
  }

  /** Consultas que ainda precisam ir para a Google Agenda (sem escopo de clínica: usado pelo job). */
  findPendingGoogleSync(limit: number) {
    return this.repository.find({
      where: { googleSyncState: 'PENDING' },
      select: { id: true, clinicId: true },
      take: limit,
      order: { updatedAt: 'ASC' },
    });
  }

  /** Marca as consultas futuras em aberto da clínica para sincronizar (primeira conexão). */
  async markFutureForGoogleSync(clinicId: string) {
    await this.repository.query(
      `UPDATE appointments SET "googleSyncState" = 'PENDING'
       WHERE "clinicId" = $1 AND status IN ('AGENDADA', 'CONFIRMADA') AND "startsAt" > now()`,
      [clinicId],
    );
  }

  async update(id: string, data: Partial<Appointment>) {
    await this.repository.update(id, data);
  }
}
