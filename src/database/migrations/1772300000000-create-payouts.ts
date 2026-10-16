import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePayouts1772300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "professionals"
        ADD COLUMN "payoutPercent" numeric(5,2),
        ADD CONSTRAINT "CHK_professionals_payoutPercent"
          CHECK ("payoutPercent" IS NULL OR ("payoutPercent" >= 0 AND "payoutPercent" <= 100))`);

    await queryRunner.query(`
      CREATE TABLE "payouts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "clinicId" uuid NOT NULL,
        "professionalId" uuid NOT NULL,
        "expenseId" uuid NOT NULL,
        "percent" numeric(5,2) NOT NULL,
        "grossAmount" numeric(10,2) NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "cutoffAt" timestamptz NOT NULL,
        "createdBy" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_payouts_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payouts_expenseId" UNIQUE ("expenseId"),
        CONSTRAINT "FK_payouts_clinicId" FOREIGN KEY ("clinicId")
          REFERENCES "clinics"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_payouts_professionalId" FOREIGN KEY ("professionalId")
          REFERENCES "professionals"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_payouts_expenseId" FOREIGN KEY ("expenseId")
          REFERENCES "expenses"("id") ON DELETE RESTRICT
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_payouts_clinic_professional" ON "payouts" ("clinicId", "professionalId")`,
    );

    // Consulta incluída num repasse; desfazer o repasse libera a consulta (SET NULL).
    await queryRunner.query(`
      ALTER TABLE "appointments"
        ADD COLUMN "payoutId" uuid,
        ADD CONSTRAINT "FK_appointments_payoutId" FOREIGN KEY ("payoutId")
          REFERENCES "payouts"("id") ON DELETE SET NULL`);
    await queryRunner.query(
      `CREATE INDEX "IDX_appointments_payoutId" ON "appointments" ("payoutId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT "FK_appointments_payoutId", DROP COLUMN "payoutId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "payouts"`);
    await queryRunner.query(
      `ALTER TABLE "professionals" DROP CONSTRAINT "CHK_professionals_payoutPercent", DROP COLUMN "payoutPercent"`,
    );
  }
}
