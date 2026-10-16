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
import { ClinicUserRole } from '../../../common/enums/clinic-user-role.enum.js';
import { ClinicUserStatus } from '../../../common/enums/clinic-user-status.enum.js';
import { Clinic } from '../../clinics/entities/clinic.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('clinic_users')
@Unique(['userId', 'clinicId'])
export class ClinicUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'userId', type: 'uuid', nullable: false })
  userId: string;

  @Column({ name: 'clinicId', type: 'uuid', nullable: false })
  clinicId: string;

  @Column({ name: 'role', type: 'enum', enum: ClinicUserRole, nullable: false })
  role: ClinicUserRole;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ClinicUserStatus,
    nullable: false,
  })
  status: ClinicUserStatus;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: Relation<User>;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinicId' })
  clinic: Relation<Clinic>;
}
