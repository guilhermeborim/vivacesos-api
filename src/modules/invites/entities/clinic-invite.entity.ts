import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Clinic } from '../../clinics/entities/clinic.entity.js';
import { ClinicUserRole } from '../../../common/enums/clinic-user-role.enum.js';

@Entity('clinic_invites')
export class ClinicInvite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'clinicId', type: 'uuid', nullable: false })
  clinicId: string;

  @Column({ name: 'email', type: 'varchar', nullable: false, unique: true })
  email: string;

  @Column({ name: 'role', type: 'enum', enum: ClinicUserRole, nullable: false })
  role: ClinicUserRole;

  @Column({ name: 'token', type: 'varchar', nullable: false, unique: true })
  token: string;

  @Column({
    name: 'accepted',
    type: 'boolean',
    default: false,
    nullable: false,
  })
  accepted: boolean;

  @Column({ name: 'expiresAt', type: 'timestamptz', nullable: false })
  expiresAt: Date;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @Column({
    name: 'acceptedAt',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  acceptedAt: Date | null;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinicId' })
  clinic: Relation<Clinic>;
}
