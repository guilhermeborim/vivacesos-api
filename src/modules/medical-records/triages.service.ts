import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClinicUserRole } from '../../common/enums/clinic-user-role.enum.js';
import { CryptoService } from '../../security/crypto.service.js';
import { AppointmentsRepository } from '../appointments/appointments.repository.js';
import { OPEN_APPOINTMENT_STATUSES } from '../appointments/enums/appointment-status.enum.js';
import { ProfessionalsRepository } from '../professionals/professionals.repository.js';
import { UsersRepository } from '../users/users.repository.js';
import { RecordAuditAction } from './enums/record-audit-action.enum.js';
import type { Actor } from './medical-records.service.js';
import { RecordAuditRepository } from './record-audit.repository.js';
import type { TriageDto } from './schemas/triage.schema.js';
import { TriagesRepository } from './triages.repository.js';

const EMPTY_TRIAGE: TriageDto = {
  systolic: null,
  diastolic: null,
  heartRate: null,
  respiratoryRate: null,
  temperatureC: null,
  spo2: null,
  weightKg: null,
  heightCm: null,
  notes: null,
};

@Injectable()
export class TriagesService {
  private readonly crypto;

  constructor(
    private readonly triages: TriagesRepository,
    private readonly audit: RecordAuditRepository,
    private readonly appointments: AppointmentsRepository,
    private readonly professionals: ProfessionalsRepository,
    private readonly users: UsersRepository,
    crypto: CryptoService,
  ) {
    this.crypto = crypto.forField('appointment:triage');
  }

  async get(clinicId: string, actor: Actor, appointmentId: string) {
    const appointment = await this.access(clinicId, actor, appointmentId);
    const stored = await this.triages.find(clinicId, appointmentId);
    await this.audit.log({
      clinicId,
      userId: actor.id,
      role: actor.role,
      patientId: appointment.patientId,
      action: RecordAuditAction.VIEW_TRIAGE,
    });
    return this.toResponse(appointmentId, stored);
  }

  async save(
    clinicId: string,
    actor: Actor,
    appointmentId: string,
    input: TriageDto,
  ) {
    const appointment = await this.access(clinicId, actor, appointmentId);
    if (!OPEN_APPOINTMENT_STATUSES.includes(appointment.status)) {
      throw new ConflictException(
        `A triagem de uma consulta ${appointment.status} não pode ser alterada!`,
      );
    }
    await this.triages.upsert(
      clinicId,
      appointmentId,
      appointment.patientId,
      this.crypto.encrypt(JSON.stringify(input)),
      actor.id,
    );
    await this.audit.log({
      clinicId,
      userId: actor.id,
      role: actor.role,
      patientId: appointment.patientId,
      action: RecordAuditAction.SAVE_TRIAGE,
    });
    return this.toResponse(
      appointmentId,
      await this.triages.find(clinicId, appointmentId),
    );
  }

  /**
   * RECEPCIONISTA acessa a triagem de qualquer consulta; ADMIN e PROFISSIONAL só as próprias,
   * como profissional ativo (o ADMIN que não atende não lê dado clínico).
   */
  private async access(clinicId: string, actor: Actor, appointmentId: string) {
    const appointment = await this.appointments.findById(
      clinicId,
      appointmentId,
    );
    if (!appointment) throw new NotFoundException('Consulta não encontrada!');
    if (actor.role === ClinicUserRole.RECEPCIONISTA) return appointment;

    const professional = await this.professionals.findByUser(
      clinicId,
      actor.id,
    );
    if (
      !professional?.active ||
      professional.id !== appointment.professionalId
    ) {
      throw new ForbiddenException(
        'Somente o profissional da consulta ou a recepção acessam a triagem.',
      );
    }
    return appointment;
  }

  private async toResponse(
    appointmentId: string,
    stored: Awaited<ReturnType<TriagesRepository['find']>>,
  ) {
    if (!stored) {
      return {
        appointmentId,
        triage: EMPTY_TRIAGE,
        updatedAt: null,
        updatedBy: null,
      };
    }
    const updater = stored.updatedBy
      ? await this.users.findById(stored.updatedBy)
      : null;
    return {
      appointmentId,
      triage: {
        ...EMPTY_TRIAGE,
        ...(JSON.parse(this.crypto.decrypt(stored.data)) as TriageDto),
      },
      updatedAt: stored.updatedAt,
      updatedBy: updater ? { userId: updater.id, name: updater.name } : null,
    };
  }
}
