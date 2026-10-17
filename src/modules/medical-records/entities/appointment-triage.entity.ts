import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Triagem de uma consulta (pressão, batimentos, temperatura…): uma por consulta, só o valor atual.
 * `data` guarda um JSON cifrado; cada leitura e alteração vai para a auditoria.
 */
@Entity('appointment_triages')
@Unique('UQ_appointment_triages_appointment', ['appointmentId'])
export class AppointmentTriage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'clinicId', type: 'uuid', nullable: false })
  clinicId: string;

  @Column({ name: 'appointmentId', type: 'uuid', nullable: false })
  appointmentId: string;

  @Column({ name: 'patientId', type: 'uuid', nullable: false })
  patientId: string;

  /** JSON cifrado (forField('appointment:triage')). */
  @Column({ name: 'data', type: 'text', nullable: false })
  data: string;

  @Column({ name: 'updatedBy', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamptz', nullable: false })
  updatedAt: Date;
}
