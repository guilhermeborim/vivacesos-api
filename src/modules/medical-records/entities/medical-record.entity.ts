import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  Unique,
} from 'typeorm';
import { Clinic } from '../../clinics/entities/clinic.entity.js';
import { Patient } from '../../patients/entities/patient.entity.js';

/** Prontuário: um por paciente e clínica. Nunca é apagado. */
@Entity('medical_records')
@Unique('UQ_medical_records_clinic_patient', ['clinicId', 'patientId'])
export class MedicalRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'clinicId', type: 'uuid', nullable: false })
  clinicId: string;

  @Column({ name: 'patientId', type: 'uuid', nullable: false })
  patientId: string;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinicId' })
  clinic: Relation<Clinic>;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patientId' })
  patient: Relation<Patient>;
}
