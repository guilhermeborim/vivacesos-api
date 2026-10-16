import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Opções da clínica, uma linha por clínica (criada sob demanda). */
@Entity('clinic_settings')
export class ClinicSettings {
  @PrimaryColumn({ name: 'clinicId', type: 'uuid' })
  clinicId: string;

  @Column({
    name: 'recurringExpensesEnabled',
    type: 'boolean',
    default: false,
    nullable: false,
  })
  recurringExpensesEnabled: boolean;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamptz', nullable: false })
  updatedAt: Date;
}
