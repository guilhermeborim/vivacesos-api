import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

export class CreatePatientTable1771255635046 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'patients',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'clinicId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            isNullable: false,
          },

          {
            name: 'cpf',
            type: 'varchar',
            isNullable: false,
          },

          {
            name: 'cpfHash',
            type: 'varchar',
            isNullable: false,
          },

          {
            name: 'phone',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'phoneHash',
            type: 'varchar',
            isNullable: false,
          },

          {
            name: 'birthDate',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'active',
            type: 'boolean',
            isNullable: false,
            default: true,
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
        uniques: [
          new TableUnique({
            name: 'UQ_cpf_clinic',
            columnNames: ['clinicId', 'cpfHash'],
          }),
          new TableUnique({
            name: 'UQ_email_clinic',
            columnNames: ['clinicId', 'email'],
          }),
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'patients',
      new TableForeignKey({
        name: 'FK_patients_clinicId',
        columnNames: ['clinicId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'clinics',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('patients', 'FK_patients_clinicId');
    await queryRunner.dropTable('patients');
  }
}
