import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { RecordAuditAction } from '../enums/record-audit-action.enum.js';

/** Auditoria de acesso ao prontuário. Só inserção; sem texto clínico, apenas IDs. */
@Entity('record_audit_logs')
export class RecordAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'clinicId', type: 'uuid', nullable: false })
  clinicId: string;

  @Column({ name: 'userId', type: 'uuid', nullable: false })
  userId: string;

  @Column({ name: 'role', type: 'varchar', nullable: false })
  role: string;

  @Column({ name: 'patientId', type: 'uuid', nullable: true, default: null })
  patientId: string | null;

  @Column({ name: 'entryId', type: 'uuid', nullable: true, default: null })
  entryId: string | null;

  @Column({
    name: 'action',
    type: 'enum',
    enum: RecordAuditAction,
    enumName: 'record_audit_action_enum',
    nullable: false,
  })
  action: RecordAuditAction;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: Relation<User>;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patientId' })
  patient: Relation<Patient>;
}
