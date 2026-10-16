import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Faixa de atendimento do profissional num dia da semana (0 = domingo … 6 = sábado). */
@Entity('professional_availability')
export class ProfessionalAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'professionalId', type: 'uuid', nullable: false })
  professionalId: string;

  @Column({ name: 'weekday', type: 'smallint', nullable: false })
  weekday: number;

  @Column({ name: 'startMinute', type: 'smallint', nullable: false })
  startMinute: number;

  @Column({ name: 'endMinute', type: 'smallint', nullable: false })
  endMinute: number;
}
