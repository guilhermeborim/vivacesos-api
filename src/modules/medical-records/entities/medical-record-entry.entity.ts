import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Appointment } from '../../appointments/entities/appointment.entity.js';
import { Professional } from '../../professionals/entities/professional.entity.js';
import { MedicalRecordEntryStatus } from '../enums/medical-record-entry-status.enum.js';
import { MedicalRecord } from './medical-record.entity.js';

/**
 * Ficha do prontuário. Imutável: só pode ser cancelada (com justificativa).
 * `content` e `cancelReason` ficam cifrados.
 */
@Entity('medical_record_entries')
export class MedicalRecordEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'clinicId', type: 'uuid', nullable: false })
  clinicId: string;

  @Column({ name: 'recordId', type: 'uuid', nullable: false })
  recordId: string;

  @Column({ name: 'appointmentId', type: 'uuid', nullable: false })
  appointmentId: string;

  @Column({ name: 'professionalId', type: 'uuid', nullable: false })
  professionalId: string;

  /** Preenchido quando a ficha é um adendo de outra ficha. */
  @Column({
    name: 'parentEntryId',
    type: 'uuid',
    nullable: true,
    default: null,
  })
  parentEntryId: string | null;

  @Column({ name: 'content', type: 'text', nullable: false })
  content: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: MedicalRecordEntryStatus,
    enumName: 'medical_record_entry_status_enum',
    default: MedicalRecordEntryStatus.ATIVA,
    nullable: false,
  })
  status: MedicalRecordEntryStatus;

  @Column({ name: 'cancelReason', type: 'text', nullable: true, default: null })
  cancelReason: string | null;

  @Column({
    name: 'canceledAt',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  canceledAt: Date | null;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @ManyToOne(() => MedicalRecord)
  @JoinColumn({ name: 'recordId' })
  record: Relation<MedicalRecord>;

  @ManyToOne(() => Appointment)
  @JoinColumn({ name: 'appointmentId' })
  appointment: Relation<Appointment>;

  @ManyToOne(() => Professional)
  @JoinColumn({ name: 'professionalId' })
  professional: Relation<Professional>;
}
