import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientClinicalProfile } from './entities/patient-clinical-profile.entity.js';

@Injectable()
export class ClinicalProfilesRepository {
  constructor(
    @InjectRepository(PatientClinicalProfile)
    private readonly repository: Repository<PatientClinicalProfile>,
  ) {}

  find(clinicId: string, patientId: string) {
    return this.repository.findOne({ where: { clinicId, patientId } });
  }

  /** Cria ou substitui o perfil do paciente na clínica. */
  async upsert(
    clinicId: string,
    patientId: string,
    data: string,
    updatedBy: string,
  ) {
    await this.repository.query(
      `INSERT INTO patient_clinical_profiles ("clinicId", "patientId", data, "updatedBy")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("clinicId", "patientId")
       DO UPDATE SET data = EXCLUDED.data, "updatedBy" = EXCLUDED."updatedBy", "updatedAt" = now()`,
      [clinicId, patientId, data, updatedBy],
    );
  }
}
