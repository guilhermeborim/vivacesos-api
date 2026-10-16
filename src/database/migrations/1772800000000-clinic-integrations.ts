import { MigrationInterface, QueryRunner } from 'typeorm';

export class ClinicIntegrations1772800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "integration_provider_enum" AS ENUM ('GOOGLE_CALENDAR', 'WHATSAPP')`,
    );
    await queryRunner.query(
      `CREATE TYPE "integration_status_enum" AS ENUM ('DISCONNECTED', 'PENDING', 'CONNECTED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "clinic_integrations" (
        "clinicId" uuid NOT NULL,
        "provider" "integration_provider_enum" NOT NULL,
        "status" "integration_status_enum" NOT NULL DEFAULT 'DISCONNECTED',
        "credentials" text,
        "config" jsonb,
        "connectedAt" timestamptz,
        "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_clinic_integrations" PRIMARY KEY ("clinicId", "provider"),
        CONSTRAINT "FK_clinic_integrations_clinicId" FOREIGN KEY ("clinicId")
          REFERENCES "clinics"("id") ON DELETE CASCADE
      )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "clinic_integrations"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "integration_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "integration_provider_enum"`);
  }
}
