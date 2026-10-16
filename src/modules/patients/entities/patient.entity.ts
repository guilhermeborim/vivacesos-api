import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Clinic } from '../../clinics/entities/clinic.entity.js';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'clinicId', type: 'uuid', nullable: false })
  clinicId: string;

  @Column({ name: 'name', type: 'varchar', nullable: false })
  name: string;

  @Column({ name: 'email', type: 'varchar', nullable: false })
  email: string;

  @Column({ name: 'cpf', type: 'varchar', nullable: false })
  cpf: string;

  @Column({ name: 'cpfHash', type: 'varchar', nullable: false })
  cpfHash: string;

  @Column({ name: 'phone', type: 'varchar', nullable: false })
  phone: string;

  @Column({ name: 'phoneHash', type: 'varchar', nullable: false })
  phoneHash: string;

  /** Data pura (YYYY-MM-DD). */
  @Column({ name: 'birthDate', type: 'date', nullable: false })
  birthDate: string;

  @Column({ name: 'active', type: 'boolean', default: true, nullable: false })
  active: boolean;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinicId' })
  clinic: Relation<Clinic>;
}
