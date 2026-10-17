import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { MedicalRecordEntry } from './medical-record-entry.entity.js';

export type EntryItemKind =
  'PRESCRICAO' | 'EXAME' | 'ATESTADO' | 'ENCAMINHAMENTO';

/**
 * Prescrição, pedido de exame, atestado ou encaminhamento de uma ficha. Imutável (trigger): vale enquanto a ficha vale.
 * `data` guarda um JSON cifrado (forField('medical-record:item')).
 */
@Entity('medical_record_entry_items')
export class MedicalRecordEntryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'clinicId', type: 'uuid', nullable: false })
  clinicId: string;

  @Column({ name: 'entryId', type: 'uuid', nullable: false })
  entryId: string;

  @Column({ name: 'kind', type: 'varchar', length: 20, nullable: false })
  kind: EntryItemKind;

  @Column({ name: 'position', type: 'smallint', nullable: false })
  position: number;

  @Column({ name: 'data', type: 'text', nullable: false })
  data: string;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @ManyToOne(() => MedicalRecordEntry, (entry) => entry.items)
  @JoinColumn({ name: 'entryId' })
  entry: Relation<MedicalRecordEntry>;
}
