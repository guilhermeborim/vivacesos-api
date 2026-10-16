import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUser1769440534456 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "users_onboardingstep_enum"
      ADD VALUE IF NOT EXISTS 'FINISHED';
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
