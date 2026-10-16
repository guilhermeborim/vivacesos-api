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
import { User } from '../../users/entities/user.entity.js';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tokenHash', type: 'varchar', nullable: false, unique: true })
  tokenHash: string;

  @Column({ name: 'userId', type: 'uuid', nullable: false })
  userId: string;

  @Column({ name: 'clinicId', type: 'uuid', nullable: true, default: null })
  clinicId: string | null;

  @Column({ name: 'expiresAt', type: 'timestamptz', nullable: false })
  expiresAt: Date;

  @Column({ name: 'isRevoked', type: 'boolean', default: false })
  isRevoked: boolean;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: Relation<User>;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinicId' })
  clinic: Relation<Clinic>;
}
