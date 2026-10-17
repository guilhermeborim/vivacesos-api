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
import { User } from '../../users/entities/user.entity.js';
import { ProfessionalType } from '../enums/professional-type.enum.js';

@Entity('professionals')
export class Professional {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'userId', type: 'uuid', nullable: true, default: null })
  userId: string;

  @Column({ name: 'clinicId', type: 'uuid', nullable: false })
  clinicId: string;

  @Column({
    name: 'type',
    type: 'enum',
    enum: ProfessionalType,
    nullable: true,
    default: ProfessionalType.MEDICO,
  })
  type: ProfessionalType;

  @Column({ name: 'crm', type: 'varchar', nullable: true, default: null })
  crm: string | null;

  @Column({ name: 'crmHash', type: 'varchar', nullable: true, default: null })
  crmHash: string | null;

  @Column({ name: 'specialty', type: 'varchar', nullable: true, default: null })
  specialty: string | null;

  /** Percentual padrão do repasse (0–100); vazio = não configurado. */
  @Column({
    name: 'payoutPercent',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
    default: null,
    transformer: {
      to: (v?: number | null) => v,
      from: (v: string | null) => (v === null ? null : Number(v)),
    },
  })
  payoutPercent: number | null;

  /** Agenda do profissional no Google Agenda da clínica (criada pelo sistema). */
  @Column({ name: 'googleCalendarId', type: 'varchar', nullable: true, default: null })
  googleCalendarId: string | null;

  /** Ligado: só atende nas faixas de `professional_availability`; desligado: qualquer horário. */
  @Column({
    name: 'availabilityRestricted',
    type: 'boolean',
    default: false,
    nullable: false,
  })
  availabilityRestricted: boolean;

  /** Duração padrão da consulta, em minutos (múltiplo de 5). */
  @Column({
    name: 'appointmentDurationMinutes',
    type: 'smallint',
    default: 60,
    nullable: false,
  })
  appointmentDurationMinutes: number;

  @Column({ name: 'active', type: 'boolean', default: true, nullable: false })
  active: boolean;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: Relation<User>;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinicId' })
  clinic: Relation<Clinic>;
}
