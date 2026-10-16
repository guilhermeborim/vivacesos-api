import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Aviso para um usuário da clínica. Sem conteúdo clínico (LGPD): só nomes, horários e IDs. */
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'clinicId', type: 'uuid', nullable: false })
  clinicId: string;

  /** Destinatário. */
  @Column({ name: 'userId', type: 'uuid', nullable: false })
  userId: string;

  @Column({ name: 'type', type: 'varchar', length: 50, nullable: false })
  type: string;

  @Column({ name: 'title', type: 'varchar', length: 150, nullable: false })
  title: string;

  @Column({ name: 'message', type: 'varchar', length: 500, nullable: false })
  message: string;

  /** Rota do front para onde o clique leva. */
  @Column({ name: 'link', type: 'varchar', length: 200, nullable: true })
  link: string | null;

  @Column({ name: 'data', type: 'jsonb', nullable: true })
  data: Record<string, string> | null;

  /** Evita avisos repetidos (ex.: despesa vencida): único por (userId, dedupeKey). */
  @Column({ name: 'dedupeKey', type: 'varchar', length: 150, nullable: true })
  dedupeKey: string | null;

  @Column({ name: 'readAt', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz', nullable: false })
  createdAt: Date;
}
