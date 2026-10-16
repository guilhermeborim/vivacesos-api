import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePatientClinicalProfiles1772500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "patient_clinical_profiles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "clinicId" uuid NOT NULL,
        "patientId" uuid NOT NULL,
        "data" text NOT NULL,
        "updatedBy" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_patient_clinical_profiles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_patient_clinical_profiles_clinic_patient" UNIQUE ("clinicId", "patientId"),
        CONSTRAINT "FK_patient_clinical_profiles_clinicId" FOREIGN KEY ("clinicId")
          REFERENCES "clinics"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_patient_clinical_profiles_patientId" FOREIGN KEY ("patientId")
          REFERENCES "patients"("id") ON DELETE RESTRICT
      )`);

    // Dado de saúde nunca é apagado (mesma regra do prontuário).
    await queryRunner.query(`
      CREATE TRIGGER trg_patient_clinical_profiles_no_delete
      BEFORE DELETE ON patient_clinical_profiles
      FOR EACH ROW EXECUTE FUNCTION medical_records_block_delete()`);

    await queryRunner.query(
      `ALTER TYPE "record_audit_action_enum" ADD VALUE IF NOT EXISTS 'VIEW_PROFILE'`,
    );
    await queryRunner.query(
      `ALTER TYPE "record_audit_action_enum" ADD VALUE IF NOT EXISTS 'UPDATE_PROFILE'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_patient_clinical_profiles_no_delete ON patient_clinical_profiles`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "patient_clinical_profiles"`);
    // Valores de enum não são removidos (o Postgres não permite); inofensivos.
  }
}
