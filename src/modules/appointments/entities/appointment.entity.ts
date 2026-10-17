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
import { PaymentMethod } from '../../../common/enums/payment-method.enum.js';
import { Clinic } from '../../clinics/entities/clinic.entity.js';
import { Patient } from '../../patients/entities/patient.entity.js';
import { Professional } from '../../professionals/entities/professional.entity.js';
import { AppointmentStatus } from '../enums/appointment-status.enum.js';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'clinicId', type: 'uuid', nullable: false })
  clinicId: string;

  @Column({ name: 'patientId', type: 'uuid', nullable: false })
  patientId: string;

  @Column({ name: 'professionalId', type: 'uuid', nullable: false })
  professionalId: string;

  @Column({ name: 'startsAt', type: 'timestamptz', nullable: false })
  startsAt: Date;

  @Column({ name: 'endsAt', type: 'timestamptz', nullable: false })
  endsAt: Date;

  @Column({
    name: 'status',
    type: 'enum',
    enum: AppointmentStatus,
    enumName: 'appointment_status_enum',
    default: AppointmentStatus.AGENDADA,
    nullable: false,
  })
  status: AppointmentStatus;

  @Column({
    name: 'price',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    nullable: false,
    transformer: { to: (v?: number) => v, from: (v: string) => Number(v) },
  })
  price: number;

  @Column({ name: 'paid', type: 'boolean', default: false, nullable: false })
  paid: boolean;

  @Column({
    name: 'paidAt',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  paidAt: Date | null;

  @Column({
    name: 'paymentMethod',
    type: 'enum',
    enum: PaymentMethod,
    enumName: 'payment_method_enum',
    nullable: true,
    default: null,
  })
  paymentMethod: PaymentMethod | null;

  /** Quando a recepção marcou a chegada do paciente. */
  @Column({
    name: 'arrivedAt',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  arrivedAt: Date | null;

  /** Evento espelhado na Google Agenda do profissional (quando a integração está ligada). */
  @Column({
    name: 'googleEventId',
    type: 'varchar',
    nullable: true,
    default: null,
  })
  googleEventId: string | null;

  /** PENDING = falta sincronizar; SYNCED = em dia; vazio = sem integração. */
  @Column({
    name: 'googleSyncState',
    type: 'varchar',
    length: 10,
    nullable: true,
    default: null,
  })
  googleSyncState: 'PENDING' | 'SYNCED' | null;

  /** Repasse em que a consulta foi incluída (trava valor e pagamento). */
  @Column({ name: 'payoutId', type: 'uuid', nullable: true, default: null })
  payoutId: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true, default: null })
  notes: string | null;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinicId' })
  clinic: Relation<Clinic>;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patientId' })
  patient: Relation<Patient>;

  @ManyToOne(() => Professional)
  @JoinColumn({ name: 'professionalId' })
  professional: Relation<Professional>;
}
