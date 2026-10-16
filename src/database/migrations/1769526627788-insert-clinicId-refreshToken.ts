import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class InsertClinicIdRefreshToken1769526627788 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "refresh_tokens"
            ADD COLUMN "clinicId" uuid NULL DEFAULT NULL
        `);

    await queryRunner.createForeignKey(
      'refresh_tokens',
      new TableForeignKey({
        name: 'FK_refresh_tokens_clinicId',
        columnNames: ['clinicId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'clinics',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
