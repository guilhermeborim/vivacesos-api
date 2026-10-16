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
import type { ExpenseRecurrence } from '../recurrence.js';

const money = {
  to: (v?: number) => v,
  from: (v: string) => Number(v),
};

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'clinicId', type: 'uuid', nullable: false })
  clinicId: string;

  @Column({ name: 'description', type: 'varchar', length: 255 })
  description: string;

  @Column({ name: 'category', type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({
    name: 'amount',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: money,
  })
  amount: number;

  @Column({ name: 'dueDate', type: 'date' })
  dueDate: string;

  @Column({ name: 'paid', type: 'boolean', default: false })
  paid: boolean;

  @Column({ name: 'paidAt', type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @Column({
    name: 'paymentMethod',
    type: 'enum',
    enum: PaymentMethod,
    enumName: 'payment_method_enum',
    nullable: true,
  })
  paymentMethod: PaymentMethod | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  /** Só o modelo da recorrência tem valor diferente de NONE. */
  @Column({
    name: 'recurrence',
    type: 'enum',
    enum: ['NONE', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'],
    enumName: 'expense_recurrence_enum',
    default: 'NONE',
  })
  recurrence: ExpenseRecurrence;

  @Column({ name: 'recurrenceEndsAt', type: 'date', nullable: true })
  recurrenceEndsAt: string | null;

  @Column({ name: 'recurrenceNextDate', type: 'date', nullable: true })
  recurrenceNextDate: string | null;

  /** Dia do mês do vencimento original (âncora da recorrência mensal). */
  @Column({ name: 'recurrenceDay', type: 'int', nullable: true })
  recurrenceDay: number | null;

  /** Despesa gerada pela recorrência: aponta para a despesa-modelo. */
  @Column({ name: 'seriesId', type: 'uuid', nullable: true })
  seriesId: string | null;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinicId' })
  clinic: Relation<Clinic>;
}
