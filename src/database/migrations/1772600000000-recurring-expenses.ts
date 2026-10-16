import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecurringExpenses1772600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "clinic_settings" (
        "clinicId" uuid NOT NULL,
        "recurringExpensesEnabled" boolean NOT NULL DEFAULT false,
        "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_clinic_settings_clinicId" PRIMARY KEY ("clinicId"),
        CONSTRAINT "FK_clinic_settings_clinicId" FOREIGN KEY ("clinicId")
          REFERENCES "clinics"("id") ON DELETE CASCADE
      )`);

    await queryRunner.query(
      `CREATE TYPE "expense_recurrence_enum" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY')`,
    );
    // A despesa original é o "modelo" da recorrência; as geradas apontam para ela em `seriesId`.
    await queryRunner.query(`
      ALTER TABLE "expenses"
        ADD COLUMN "recurrence" "expense_recurrence_enum" NOT NULL DEFAULT 'NONE',
        ADD COLUMN "recurrenceEndsAt" date,
        ADD COLUMN "recurrenceNextDate" date,
        ADD COLUMN "recurrenceDay" int,
        ADD COLUMN "seriesId" uuid,
        ADD CONSTRAINT "FK_expenses_seriesId" FOREIGN KEY ("seriesId")
          REFERENCES "expenses"("id") ON DELETE SET NULL`);
    // Duas execuções do job nunca geram a mesma ocorrência duas vezes.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_expenses_series_due" ON "expenses" ("seriesId", "dueDate") WHERE "seriesId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_expenses_recurrence_next" ON "expenses" ("recurrenceNextDate") WHERE "recurrence" <> 'NONE'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_expenses_recurrence_next"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_expenses_series_due"`);
    await queryRunner.query(`
      ALTER TABLE "expenses"
        DROP CONSTRAINT "FK_expenses_seriesId",
        DROP COLUMN "seriesId", DROP COLUMN "recurrenceDay",
        DROP COLUMN "recurrenceNextDate", DROP COLUMN "recurrenceEndsAt",
        DROP COLUMN "recurrence"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "expense_recurrence_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "clinic_settings"`);
  }
}
