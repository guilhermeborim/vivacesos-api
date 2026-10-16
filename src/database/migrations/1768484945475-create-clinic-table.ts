import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateClinicTable1768484945475 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'clinics',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar(50)',
            isNullable: false,
          },
          {
            name: 'cnpj',
            type: 'varchar(100)',
            isUnique: true,
            isNullable: false,
          },

          {
            name: 'cnpjHash',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'phone',
            type: 'varchar(20)',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'active',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          {
            name: 'cep',
            type: 'varchar(20)',
            isNullable: false,
          },
          {
            name: 'road',
            type: 'varchar(100)',
            isNullable: false,
          },
          {
            name: 'number',
            type: 'varchar(20)',
            isNullable: false,
          },
          {
            name: 'neighborhood',
            type: 'varchar(50)',
            isNullable: false,
          },
          {
            name: 'city',
            type: 'varchar(50)',
            isNullable: false,
          },
          {
            name: 'complement',
            type: 'varchar(100)',
            isNullable: true,
            default: null,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('clinics');
  }
}
