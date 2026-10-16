import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Professional } from '../../professionals/entities/professional.entity.js';

/** Modelo de ficha do profissional. Serve só de texto inicial (a ficha guarda uma cópia). */
@Entity('record_templates')
@Unique('UQ_record_templates_professional_name', ['professionalId', 'name'])
export class RecordTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'clinicId', type: 'uuid', nullable: false })
  clinicId: string;

  @Column({ name: 'professionalId', type: 'uuid', nullable: false })
  professionalId: string;

  @Column({ name: 'name', type: 'varchar', length: 100, nullable: false })
  name: string;

  /** Cifrado. */
  @Column({ name: 'content', type: 'text', nullable: false })
  content: string;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @ManyToOne(() => Professional)
  @JoinColumn({ name: 'professionalId' })
  professional: Relation<Professional>;
}
