import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CryptoService } from '../../security/crypto.service.js';
import { PatientsRepository } from '../patients/patients.repository.js';
import { ProfessionalsRepository } from '../professionals/professionals.repository.js';
import { UsersRepository } from '../users/users.repository.js';
import { ClinicalProfilesRepository } from './clinical-profiles.repository.js';
import { RecordAuditAction } from './enums/record-audit-action.enum.js';
import { RecordAuditRepository } from './record-audit.repository.js';
import type { Actor } from './medical-records.service.js';
import type { ClinicalProfileDto } from './schemas/clinical-profile.schema.js';

const EMPTY_PROFILE: ClinicalProfileDto = {
  heightCm: null,
  weightKg: null,
  diabetes: null,
  drugAllergies: null,
  otherInfo: null,
};

@Injectable()
export class ClinicalProfilesService {
  private readonly crypto;

  constructor(
    private readonly profiles: ClinicalProfilesRepository,
    private readonly audit: RecordAuditRepository,
    private readonly patients: PatientsRepository,
    private readonly professionals: ProfessionalsRepository,
    private readonly users: UsersRepository,
    crypto: CryptoService,
  ) {
    this.crypto = crypto.forField('patient:clinical-profile');
  }

  async get(clinicId: string, actor: Actor, patientId: string) {
    await this.assertAccess(clinicId, actor.id, patientId);
    const stored = await this.profiles.find(clinicId, patientId);
    await this.audit.log({
      clinicId,
      userId: actor.id,
      role: actor.role,
      patientId,
      action: RecordAuditAction.VIEW_PROFILE,
    });
    return this.toResponse(patientId, stored);
  }

  async update(
    clinicId: string,
    actor: Actor,
    patientId: string,
    input: ClinicalProfileDto,
  ) {
    await this.assertAccess(clinicId, actor.id, patientId);
    await this.profiles.upsert(
      clinicId,
      patientId,
      this.crypto.encrypt(JSON.stringify(input)),
      actor.id,
    );
    await this.audit.log({
      clinicId,
      userId: actor.id,
      role: actor.role,
      patientId,
      action: RecordAuditAction.UPDATE_PROFILE,
    });
    return this.toResponse(
      patientId,
      await this.profiles.find(clinicId, patientId),
    );
  }

  /** Só profissional ativo da clínica (inclui o ADMIN que atende) e paciente da clínica. */
  private async assertAccess(
    clinicId: string,
    userId: string,
    patientId: string,
  ) {
    const professional = await this.professionals.findByUser(clinicId, userId);
    if (!professional?.active) {
      throw new ForbiddenException(
        'Somente profissionais ativos da clínica acessam os dados básicos do paciente.',
      );
    }
    if (!(await this.patients.findById(clinicId, patientId))) {
      throw new NotFoundException('Paciente não encontrado!');
    }
  }

  private async toResponse(
    patientId: string,
    stored: Awaited<ReturnType<ClinicalProfilesRepository['find']>>,
  ) {
    if (!stored) {
      return {
        patientId,
        profile: EMPTY_PROFILE,
        updatedAt: null,
        updatedBy: null,
      };
    }
    const updater = stored.updatedBy
      ? await this.users.findById(stored.updatedBy)
      : null;
    return {
      patientId,
      profile: {
        ...EMPTY_PROFILE,
        ...(JSON.parse(this.crypto.decrypt(stored.data)) as ClinicalProfileDto),
      },
      updatedAt: stored.updatedAt,
      updatedBy: updater ? { userId: updater.id, name: updater.name } : null,
    };
  }
}
