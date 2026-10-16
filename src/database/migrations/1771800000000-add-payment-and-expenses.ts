import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentAndExpenses1771800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "payment_method_enum" AS ENUM ('PIX', 'CARTAO', 'DINHEIRO')`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments"
        ADD COLUMN "paidAt" timestamptz,
        ADD COLUMN "paymentMethod" "payment_method_enum"`,
    );
    await queryRunner.query(`
      CREATE TABLE "expenses" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "clinicId" uuid NOT NULL,
        "description" varchar(255) NOT NULL,
        "category" varchar(100),
        "amount" numeric(10,2) NOT NULL,
        "dueDate" date NOT NULL,
        "paid" boolean NOT NULL DEFAULT false,
        "paidAt" timestamptz,
        "paymentMethod" "payment_method_enum",
        "notes" text,
        "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_expenses_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_expenses_clinicId" FOREIGN KEY ("clinicId")
          REFERENCES "clinics"("id") ON DELETE CASCADE
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_expenses_clinic_due" ON "expenses" ("clinicId", "dueDate")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "expenses"`);
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP COLUMN "paymentMethod", DROP COLUMN "paidAt"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_method_enum"`);
  }
}
