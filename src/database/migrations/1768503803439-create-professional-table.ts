import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

export class CreateProfessionalTable1768503803439 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'professionals',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: true,
            default: null,
          },
          {
            name: 'clinicId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['MEDICO'],
            enumName: 'professional_type_enum',
            isNullable: true,
          },
          {
            name: 'crm',
            type: 'varchar',
            isNullable: true,
            default: null,
          },
          {
            name: 'crmHash',
            type: 'varchar',
            isNullable: true,
            default: null,
          },
          {
            name: 'specialty',
            type: 'varchar',
            isNullable: true,
            default: null,
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
            name: 'UQ_professionals_clinic_crm',
            columnNames: ['clinicId', 'crmHash'],
          }),
          new TableUnique({
            name: 'UQ_professionals_user_clinic',
            columnNames: ['userId', 'clinicId'],
          }),
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'professionals',
      new TableForeignKey({
        name: 'FK_professionals_userId',
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'professionals',
      new TableForeignKey({
        name: 'FK_professionals_clinicId',
        columnNames: ['clinicId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'clinics',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(
      'professionals',
      'FK_professionals_userId',
    );
    await queryRunner.dropForeignKey(
      'professionals',
      'FK_professionals_clinicId',
    );
    await queryRunner.dropTable('professionals');
    await queryRunner.query(`DROP TYPE IF EXISTS professional_type_enum`);
  }
}
