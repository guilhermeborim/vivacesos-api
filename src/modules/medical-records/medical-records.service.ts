import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ClinicUserRole } from '../../common/enums/clinic-user-role.enum.js';
import { CryptoService } from '../../security/crypto.service.js';
import { AppointmentsRepository } from '../appointments/appointments.repository.js';
import { RECORDABLE_APPOINTMENT_STATUSES } from '../appointments/enums/appointment-status.enum.js';
import {
  PATIENT_CREATED,
  PatientCreatedEvent,
} from '../patients/events/patient-created.event.js';
import { PatientsRepository } from '../patients/patients.repository.js';
import { ProfessionalsRepository } from '../professionals/professionals.repository.js';
import type { MedicalRecordEntry } from './entities/medical-record-entry.entity.js';
import { MedicalRecordEntryStatus } from './enums/medical-record-entry-status.enum.js';
import { MedicalRecordsRepository } from './medical-records.repository.js';
import { RecordAuditAction } from './enums/record-audit-action.enum.js';
import { RecordAuditRepository } from './record-audit.repository.js';
import type {
  CancelEntryDto,
  CreateEntryDto,
  DayRecordsDto,
  ListAuditDto,
} from './schemas/medical-record.schema.js';

export interface Actor {
  id: string;
  role: ClinicUserRole;
}

@Injectable()
export class MedicalRecordsService {
  private readonly contentCrypto;
  private readonly reasonCrypto;

  constructor(
    private readonly records: MedicalRecordsRepository,
    private readonly audit: RecordAuditRepository,
    private readonly patients: PatientsRepository,
    private readonly professionals: ProfessionalsRepository,
    private readonly appointments: AppointmentsRepository,
    crypto: CryptoService,
  ) {
    this.contentCrypto = crypto.forField('medical-record:content');
    this.reasonCrypto = crypto.forField('medical-record:cancel-reason');
  }

  /** Abre o prontuário assim que o paciente é cadastrado. */
  @OnEvent(PATIENT_CREATED)
  async onPatientCreated(event: PatientCreatedEvent) {
    await this.records.ensureForPatient(event.clinicId, event.patientId);
  }

  /** Todos os prontuários da clínica. */
  async findByClinic(clinicId: string, userId: string) {
    await this.getProfessionalOrFail(clinicId, userId);
    await this.records.ensureForClinic(clinicId);

    const [list, lastDates] = await Promise.all([
      this.records.findByClinic(clinicId),
      this.records.lastEntryDates(clinicId),
    ]);

    return list
      .map((r) => ({
        recordId: r.id,
        patient: {
          patientId: r.patientId,
          name: r.patient.name,
          birthDate: r.patient.birthDate,
          active: r.patient.active,
        },
        lastEntryAt: lastDates.get(r.id) ?? null,
      }))
      .sort((a, b) => a.patient.name.localeCompare(b.patient.name, 'pt-BR'));
  }

  /** Prontuários dos pacientes com consulta do próprio profissional no período. */
  async findDay(clinicId: string, userId: string, input: DayRecordsDto) {
    const professional = await this.getProfessionalOrFail(clinicId, userId);
    const list = await this.appointments.findByClinic(clinicId, {
      from: new Date(input.from),
      to: new Date(input.to),
      professionalId: professional.id,
    });
    const recordable = list.filter((a) =>
      RECORDABLE_APPOINTMENT_STATUSES.includes(a.status),
    );

    const patientIds = [...new Set(recordable.map((a) => a.patientId))];
    await Promise.all(
      patientIds.map((id) => this.records.ensureForPatient(clinicId, id)),
    );
    const records = await this.records.findByPatientIds(clinicId, patientIds);
    const recordByPatient = new Map(records.map((r) => [r.patientId, r.id]));

    return recordable.map((a) => ({
      recordId: recordByPatient.get(a.patientId) ?? null,
      appointment: {
        appointmentId: a.id,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        status: a.status,
      },
      patient: { patientId: a.patientId, name: a.patient.name },
    }));
  }

  /** Prontuário de um paciente com a linha do tempo das fichas. */
  async findByPatient(clinicId: string, actor: Actor, patientId: string) {
    await this.getProfessionalOrFail(clinicId, actor.id);
    const patient = await this.patients.findById(clinicId, patientId);
    if (!patient) throw new NotFoundException('Paciente não encontrado!');

    const record = await this.records.ensureForPatient(clinicId, patientId);
    const entries = await this.records.findEntries(clinicId, record.id);
    await this.audit.log({
      clinicId,
      userId: actor.id,
      role: actor.role,
      patientId,
      action: RecordAuditAction.VIEW_RECORD,
    });

    return {
      recordId: record.id,
      patient: {
        patientId: patient.id,
        name: patient.name,
        birthDate: patient.birthDate,
        active: patient.active,
      },
      entries: entries.map((e) => this.toEntryResponse(e)),
    };
  }

  async createEntry(
    clinicId: string,
    actor: Actor,
    patientId: string,
    input: CreateEntryDto,
  ) {
    const professional = await this.getProfessionalOrFail(clinicId, actor.id);
    const patient = await this.patients.findById(clinicId, patientId);
    if (!patient) throw new NotFoundException('Paciente não encontrado!');
    const record = await this.records.ensureForPatient(clinicId, patientId);

    let appointmentId: string;
    let parentEntryId: string | null = null;

    if (input.parentEntryId) {
      const parent = await this.records.findEntryById(
        clinicId,
        input.parentEntryId,
      );
      if (!parent || parent.recordId !== record.id) {
        throw new NotFoundException('Ficha original não encontrada!');
      }
      if (parent.status === MedicalRecordEntryStatus.CANCELADA) {
        throw new BadRequestException(
          'Não é possível criar adendo de uma ficha cancelada!',
        );
      }
      if (parent.parentEntryId) {
        throw new BadRequestException(
          'Não é possível criar adendo de um adendo! Use a ficha original.',
        );
      }
      appointmentId = parent.appointmentId;
      parentEntryId = parent.id;
    } else {
      const appointment = await this.appointments.findById(
        clinicId,
        input.appointmentId!,
      );
      if (!appointment || appointment.patientId !== patientId) {
        throw new NotFoundException('Consulta não encontrada!');
      }
      if (appointment.professionalId !== professional.id) {
        throw new ForbiddenException(
          'Somente o profissional da consulta pode criar a ficha!',
        );
      }
      if (!RECORDABLE_APPOINTMENT_STATUSES.includes(appointment.status)) {
        throw new BadRequestException(
          'Somente consultas confirmadas podem receber ficha!',
        );
      }
      if (
        await this.records.hasActiveEntryForAppointment(
          clinicId,
          appointment.id,
        )
      ) {
        throw new ConflictException(
          'Esta consulta já possui uma ficha ativa! Use um adendo para complementar.',
        );
      }
      appointmentId = appointment.id;
    }

    const entry = await this.records.createEntry({
      clinicId,
      recordId: record.id,
      appointmentId,
      professionalId: professional.id,
      parentEntryId,
      content: this.contentCrypto.encrypt(input.content),
    });

    await this.audit.log({
      clinicId,
      userId: actor.id,
      role: actor.role,
      patientId,
      entryId: entry.id,
      action: RecordAuditAction.CREATE_ENTRY,
    });

    return this.toEntryResponse(entry);
  }

  async cancelEntry(
    clinicId: string,
    actor: Actor,
    entryId: string,
    input: CancelEntryDto,
  ) {
    const professional = await this.getProfessionalOrFail(clinicId, actor.id);
    const entry = await this.records.findEntryById(clinicId, entryId);
    if (!entry) throw new NotFoundException('Ficha não encontrada!');
    if (entry.professionalId !== professional.id) {
      throw new ForbiddenException('Somente o autor pode cancelar a ficha!');
    }
    if (entry.status === MedicalRecordEntryStatus.CANCELADA) {
      throw new ConflictException('Esta ficha já está cancelada!');
    }

    await this.records.cancelEntry(
      entryId,
      this.reasonCrypto.encrypt(input.reason),
    );
    await this.audit.log({
      clinicId,
      userId: actor.id,
      role: actor.role,
      patientId: entry.record.patientId,
      entryId,
      action: RecordAuditAction.CANCEL_ENTRY,
    });
  }

  /** Auditoria de acessos (somente IDs; o ADMIN não lê o conteúdo das fichas). */
  async findAudit(clinicId: string, actor: Actor, filters: ListAuditDto) {
    const [list, total] = await this.audit.findByClinic(clinicId, {
      ...filters,
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
    });
    await this.audit.log({
      clinicId,
      userId: actor.id,
      role: actor.role,
      patientId: filters.patientId,
      action: RecordAuditAction.VIEW_AUDIT,
    });

    return {
      total,
      items: list.map((l) => ({
        auditId: l.id,
        action: l.action,
        createdAt: l.createdAt,
        role: l.role,
        entryId: l.entryId,
        user: { userId: l.userId, name: l.user.name },
        patient: l.patient
          ? { patientId: l.patientId, name: l.patient.name }
          : null,
      })),
    };
  }

  /** Indica se a consulta tem ficha ativa (sem expor o conteúdo). */
  async entryStatus(clinicId: string, appointmentId: string) {
    const appointment = await this.appointments.findById(
      clinicId,
      appointmentId,
    );
    if (!appointment) throw new NotFoundException('Consulta não encontrada!');
    return {
      hasActiveEntry: await this.records.hasActiveEntryForAppointment(
        clinicId,
        appointmentId,
      ),
    };
  }

  /** O usuário precisa ser profissional ativo da clínica (inclui ADMIN que atende). */
  private async getProfessionalOrFail(clinicId: string, userId: string) {
    const professional = await this.professionals.findByUser(clinicId, userId);
    if (!professional?.active) {
      throw new ForbiddenException(
        'Somente profissionais ativos da clínica acessam prontuários.',
      );
    }
    return professional;
  }

  private toEntryResponse(e: MedicalRecordEntry) {
    return {
      entryId: e.id,
      parentEntryId: e.parentEntryId,
      status: e.status,
      content: this.contentCrypto.decrypt(e.content),
      cancelReason: e.cancelReason
        ? this.reasonCrypto.decrypt(e.cancelReason)
        : null,
      canceledAt: e.canceledAt,
      createdAt: e.createdAt,
      appointment: {
        appointmentId: e.appointmentId,
        startsAt: e.appointment.startsAt,
      },
      professional: {
        professionalId: e.professionalId,
        name: e.professional.user?.name ?? null,
      },
    };
  }
}
