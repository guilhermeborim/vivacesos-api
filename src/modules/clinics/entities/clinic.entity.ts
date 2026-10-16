import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('clinics')
export class Clinic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', type: 'varchar', nullable: false })
  name: string;

  @Column({ name: 'cnpj', type: 'varchar', unique: true, nullable: false })
  cnpj: string;

  @Column({ name: 'cnpjHash', type: 'varchar', nullable: false, unique: true })
  cnpjHash: string;

  @Column({ name: 'phone', type: 'varchar', unique: true, nullable: false })
  phone: string;

  @Column({ name: 'active', type: 'boolean', default: true, nullable: false })
  active: boolean;

  @Column({ name: 'cep', type: 'varchar', nullable: false })
  cep: string;

  @Column({ name: 'road', type: 'varchar', nullable: false })
  road: string;

  @Column({ name: 'number', type: 'varchar', nullable: false })
  number: string;

  @Column({ name: 'neighborhood', type: 'varchar', nullable: false })
  neighborhood: string;

  @Column({ name: 'city', type: 'varchar', nullable: false })
  city: string;

  @Column({
    name: 'complement',
    type: 'varchar',
    nullable: true,
    default: null,
  })
  complement: string | null;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamptz', nullable: false })
  updatedAt: Date;
}
