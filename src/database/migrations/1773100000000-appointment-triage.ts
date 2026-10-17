import { MigrationInterface, QueryRunner } from 'typeorm';

export class AppointmentTriage1773100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "appointment_triages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "clinicId" uuid NOT NULL,
        "appointmentId" uuid NOT NULL,
        "patientId" uuid NOT NULL,
        "data" text NOT NULL,
        "updatedBy" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_appointment_triages_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_appointment_triages_appointment" UNIQUE ("appointmentId"),
        CONSTRAINT "FK_appointment_triages_clinicId" FOREIGN KEY ("clinicId")
          REFERENCES "clinics"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_appointment_triages_appointmentId" FOREIGN KEY ("appointmentId")
          REFERENCES "appointments"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_appointment_triages_patientId" FOREIGN KEY ("patientId")
          REFERENCES "patients"("id") ON DELETE RESTRICT
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_appointment_triages_clinic_patient" ON "appointment_triages" ("clinicId", "patientId")`,
    );

    // Dado de saúde nunca é apagado (mesma regra do prontuário).
    await queryRunner.query(`
      CREATE TRIGGER trg_appointment_triages_no_delete
      BEFORE DELETE ON appointment_triages
      FOR EACH ROW EXECUTE FUNCTION medical_records_block_delete()`);

    await queryRunner.query(
      `ALTER TYPE "record_audit_action_enum" ADD VALUE IF NOT EXISTS 'VIEW_TRIAGE'`,
    );
    await queryRunner.query(
      `ALTER TYPE "record_audit_action_enum" ADD VALUE IF NOT EXISTS 'SAVE_TRIAGE'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_appointment_triages_no_delete ON appointment_triages`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "appointment_triages"`);
    // Valores de enum não são removidos (o Postgres não permite); inofensivos.
  }
}
