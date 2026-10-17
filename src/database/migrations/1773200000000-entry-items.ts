import { MigrationInterface, QueryRunner } from 'typeorm';

export class EntryItems1773200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Prescrições e pedidos de exame que nascem junto com a ficha (ou adendo).
    await queryRunner.query(`
      CREATE TABLE "medical_record_entry_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "clinicId" uuid NOT NULL,
        "entryId" uuid NOT NULL,
        "kind" varchar(12) NOT NULL,
        "position" smallint NOT NULL,
        "data" text NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_medical_record_entry_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_medical_record_entry_items_kind" CHECK ("kind" IN ('PRESCRICAO', 'EXAME')),
        CONSTRAINT "FK_medical_record_entry_items_clinicId" FOREIGN KEY ("clinicId")
          REFERENCES "clinics"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_medical_record_entry_items_entryId" FOREIGN KEY ("entryId")
          REFERENCES "medical_record_entries"("id") ON DELETE RESTRICT
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_medical_record_entry_items_entry" ON "medical_record_entry_items" ("entryId", "position")`,
    );

    // Itens são imutáveis: nem apagados nem editados (quem muda de estado é a ficha).
    await queryRunner.query(`
      CREATE FUNCTION medical_record_entry_items_block_update() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'Prescrições e exames de uma ficha não podem ser editados';
      END;
      $$ LANGUAGE plpgsql`);
    await queryRunner.query(`
      CREATE TRIGGER trg_medical_record_entry_items_no_delete
      BEFORE DELETE ON medical_record_entry_items
      FOR EACH ROW EXECUTE FUNCTION medical_records_block_delete()`);
    await queryRunner.query(`
      CREATE TRIGGER trg_medical_record_entry_items_no_update
      BEFORE UPDATE ON medical_record_entry_items
      FOR EACH ROW EXECUTE FUNCTION medical_record_entry_items_block_update()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_medical_record_entry_items_no_update ON medical_record_entry_items`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_medical_record_entry_items_no_delete ON medical_record_entry_items`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS medical_record_entry_items_block_update()`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "medical_record_entry_items"`,
    );
  }
}
