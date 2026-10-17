import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../../security/security.module.js';
import { AppointmentsModule } from '../appointments/appointments.module.js';
import { ClinicUsersModule } from '../clinic-users/clinic-users.module.js';
import { PatientsModule } from '../patients/patients.module.js';
import { ProfessionalsModule } from '../professionals/professionals.module.js';
import { UsersModule } from '../users/users.module.js';
import { MedicalRecordEntryItem } from './entities/medical-record-entry-item.entity.js';
import { MedicalRecordEntry } from './entities/medical-record-entry.entity.js';
import { RecordTemplate } from './entities/record-template.entity.js';
import { RecordAuditLog } from './entities/record-audit-log.entity.js';
import { MedicalRecord } from './entities/medical-record.entity.js';
import { AppointmentTriage } from './entities/appointment-triage.entity.js';
import { PatientClinicalProfile } from './entities/patient-clinical-profile.entity.js';
import { TriagesController } from './triages.controller.js';
import { TriagesRepository } from './triages.repository.js';
import { TriagesService } from './triages.service.js';
import { ClinicalProfilesController } from './clinical-profiles.controller.js';
import { ClinicalProfilesRepository } from './clinical-profiles.repository.js';
import { ClinicalProfilesService } from './clinical-profiles.service.js';
import { MedicalRecordsController } from './medical-records.controller.js';
import { MedicalRecordsRepository } from './medical-records.repository.js';
import { MedicalRecordsService } from './medical-records.service.js';
import { RecordTemplatesController } from './record-templates.controller.js';
import { RecordTemplatesRepository } from './record-templates.repository.js';
import { RecordTemplatesService } from './record-templates.service.js';
import { RecordAuditRepository } from './record-audit.repository.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MedicalRecord,
      MedicalRecordEntry,
      MedicalRecordEntryItem,
      RecordAuditLog,
      RecordTemplate,
      PatientClinicalProfile,
      AppointmentTriage,
    ]),
    SecurityModule,
    UsersModule,
    ClinicUsersModule,
    PatientsModule,
    ProfessionalsModule,
    AppointmentsModule,
  ],
  controllers: [
    RecordTemplatesController,
    ClinicalProfilesController,
    TriagesController,
    MedicalRecordsController,
  ],
  providers: [
    MedicalRecordsService,
    MedicalRecordsRepository,
    RecordAuditRepository,
    RecordTemplatesService,
    RecordTemplatesRepository,
    ClinicalProfilesService,
    ClinicalProfilesRepository,
    TriagesService,
    TriagesRepository,
  ],
})
export class MedicalRecordsModule {}
