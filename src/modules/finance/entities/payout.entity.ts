import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Professional } from '../../professionals/entities/professional.entity.js';
import { Expense } from './expense.entity.js';

const money = {
  to: (v?: number) => v,
  from: (v: string) => Number(v),
};

/**
 * Repasse ao profissional: agrupa as consultas pagas ainda não repassadas até `cutoffAt`.
 * O valor vira uma despesa (`expense`), que é paga normalmente em Despesas.
 */
@Entity('payouts')
export class Payout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'clinicId', type: 'uuid', nullable: false })
  clinicId: string;

  @Column({ name: 'professionalId', type: 'uuid', nullable: false })
  professionalId: string;

  @Column({ name: 'expenseId', type: 'uuid', nullable: false })
  expenseId: string;

  @Column({
    name: 'percent',
    type: 'numeric',
    precision: 5,
    scale: 2,
    transformer: money,
  })
  percent: number;

  /** Soma das consultas incluídas. */
  @Column({
    name: 'grossAmount',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: money,
  })
  grossAmount: number;

  /** Valor do repasse (`grossAmount × percent`). */
  @Column({
    name: 'amount',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: money,
  })
  amount: number;

  @Column({ name: 'cutoffAt', type: 'timestamptz', nullable: false })
  cutoffAt: Date;

  @Column({ name: 'createdBy', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Professional)
  @JoinColumn({ name: 'professionalId' })
  professional: Relation<Professional>;

  @OneToOne(() => Expense)
  @JoinColumn({ name: 'expenseId' })
  expense: Relation<Expense>;
}
