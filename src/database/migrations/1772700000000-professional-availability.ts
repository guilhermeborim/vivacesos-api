import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfessionalAvailability1772700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Desligado = atende em qualquer horário (comportamento atual de todos os profissionais).
    await queryRunner.query(
      `ALTER TABLE "professionals" ADD COLUMN "availabilityRestricted" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`
      CREATE TABLE "professional_availability" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "professionalId" uuid NOT NULL,
        "weekday" smallint NOT NULL,
        "startMinute" smallint NOT NULL,
        "endMinute" smallint NOT NULL,
        CONSTRAINT "PK_professional_availability_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_professional_availability_professionalId" FOREIGN KEY ("professionalId")
          REFERENCES "professionals"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_professional_availability_weekday" CHECK ("weekday" BETWEEN 0 AND 6),
        CONSTRAINT "CHK_professional_availability_range"
          CHECK ("startMinute" >= 0 AND "endMinute" <= 1440 AND "startMinute" < "endMinute"
                 AND "startMinute" % 60 = 0 AND "endMinute" % 60 = 0)
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_professional_availability_professional" ON "professional_availability" ("professionalId", "weekday")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "professional_availability"`);
    await queryRunner.query(
      `ALTER TABLE "professionals" DROP COLUMN "availabilityRestricted"`,
    );
  }
}
