import { MigrationInterface, QueryRunner } from 'typeorm';

export class GoogleCalendarSync1772900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "professionals" ADD COLUMN "googleCalendarId" varchar`,
    );
    await queryRunner.query(`
      ALTER TABLE "appointments"
        ADD COLUMN "googleEventId" varchar,
        ADD COLUMN "googleSyncState" varchar(10)`);
    await queryRunner.query(
      `CREATE INDEX "IDX_appointments_google_pending" ON "appointments" ("updatedAt") WHERE "googleSyncState" = 'PENDING'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_appointments_google_pending"`);
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP COLUMN "googleSyncState", DROP COLUMN "googleEventId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "professionals" DROP COLUMN "googleCalendarId"`,
    );
  }
}
