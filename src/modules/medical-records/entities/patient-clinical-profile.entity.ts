import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Dados básicos de saúde do paciente (altura, peso, diabetes, alergias…): só o valor atual.
 * `data` guarda um JSON cifrado; cada leitura e alteração vai para a auditoria.
 */
@Entity('patient_clinical_profiles')
@Unique('UQ_patient_clinical_profiles_clinic_patient', [
  'clinicId',
  'patientId',
])
export class PatientClinicalProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'clinicId', type: 'uuid', nullable: false })
  clinicId: string;

  @Column({ name: 'patientId', type: 'uuid', nullable: false })
  patientId: string;

  /** JSON cifrado (forField('patient:clinical-profile')). */
  @Column({ name: 'data', type: 'text', nullable: false })
  data: string;

  @Column({ name: 'updatedBy', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamptz', nullable: false })
  updatedAt: Date;
}
