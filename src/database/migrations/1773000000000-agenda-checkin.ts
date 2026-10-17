import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgendaCheckin1773000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "appointment_status_enum" ADD VALUE IF NOT EXISTS 'CHEGOU'`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD COLUMN "arrivedAt" timestamptz`,
    );
    // Duração padrão da consulta (hoje todas valem 1 h).
    await queryRunner.query(`
      ALTER TABLE "professionals"
        ADD COLUMN "appointmentDurationMinutes" smallint NOT NULL DEFAULT 60,
        ADD CONSTRAINT "CHK_professionals_appointmentDurationMinutes"
          CHECK ("appointmentDurationMinutes" BETWEEN 5 AND 240 AND "appointmentDurationMinutes" % 5 = 0)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "professionals"
        DROP CONSTRAINT "CHK_professionals_appointmentDurationMinutes",
        DROP COLUMN "appointmentDurationMinutes"`);
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP COLUMN "arrivedAt"`,
    );
    // Postgres não remove valor de enum: 'CHEGOU' permanece no tipo.
  }
}
