import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserOnboardingStep } from '../enums/user-onboarding-step.enum.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', type: 'varchar', nullable: false })
  name: string;

  @Column({ name: 'email', type: 'varchar', unique: true, nullable: false })
  email: string;

  @Column({ name: 'password', type: 'varchar', nullable: false })
  password: string;

  @Column({ name: 'active', type: 'boolean', default: true, nullable: false })
  active: boolean;

  @Column({
    name: 'onboardingStep',
    type: 'enum',
    enum: UserOnboardingStep,
    nullable: true,
    default: UserOnboardingStep.CREATE_CLINIC,
  })
  onboardingStep: UserOnboardingStep;

  @Column({
    name: 'emailVerified',
    type: 'boolean',
    default: false,
    nullable: false,
  })
  emailVerified: boolean;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamptz', nullable: false })
  updatedAt: Date;
}
