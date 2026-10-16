import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

export class CreateClinicusersTable1768485083780 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'clinic_users',
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
            isNullable: false,
          },
          {
            name: 'clinicId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['ADMIN', 'PROFISSIONAL', 'RECEPCIONISTA'],
            enumName: 'clinic_user_role_enum',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['INVITADO', 'ATIVO', 'INATIVO', 'BLOQUEADO'],
            enumName: 'clinic_user_status_enum',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        uniques: [
          new TableUnique({
            name: 'UQ_clinic_users_user_clinic',
            columnNames: ['userId', 'clinicId'],
          }),
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'clinic_users',
      new TableForeignKey({
        name: 'FK_clinic_users_userId',
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'clinic_users',
      new TableForeignKey({
        name: 'FK_clinic_users_clinicId',
        columnNames: ['clinicId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'clinics',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('clinic_users', 'FK_clinic_users_userId');
    await queryRunner.dropForeignKey(
      'clinic_users',
      'FK_clinic_users_clinicId',
    );
    await queryRunner.dropTable('clinic_users');
    await queryRunner.query(`DROP TYPE IF EXISTS clinic_user_role_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS clinic_user_status_enum`);
  }
}
