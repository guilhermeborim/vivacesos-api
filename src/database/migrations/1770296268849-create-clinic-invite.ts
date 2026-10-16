import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateClinicInvite1770296268849 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'clinic_invites',
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
            name: 'email',
            type: 'varchar(100)',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['ADMIN', 'PROFISSIONAL', 'RECEPCIONISTA'],
            enumName: 'clinic_invites_role_enum',
            isNullable: false,
          },
          {
            name: 'token',
            type: 'varchar',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'accepted',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'expiresAt',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'acceptedAt',
            type: 'timestamptz',
            isNullable: true,
            default: null,
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'clinic_invites',
      new TableForeignKey({
        name: 'FK_clinic_invites_clinicId',
        columnNames: ['clinicId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'clinics',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(
      'clinic_invites',
      'FK_clinic_invites_clinicId',
    );
    await queryRunner.dropTable('clinic_invites');
    await queryRunner.query(`DROP TYPE IF EXISTS clinic_invites_role_enum`);
  }
}
