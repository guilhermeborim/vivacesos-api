import { MigrationInterface, QueryRunner } from 'typeorm';

export class EntryItemsCertificatesReferrals1773300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Mesma tabela das prescrições/exames: atestados e encaminhamentos nascem junto com a ficha.
    await queryRunner.query(
      `ALTER TABLE "medical_record_entry_items" DROP CONSTRAINT "CHK_medical_record_entry_items_kind"`,
    );
    await queryRunner.query(
      `ALTER TABLE "medical_record_entry_items" ALTER COLUMN "kind" TYPE varchar(20)`,
    );
    await queryRunner.query(`
      ALTER TABLE "medical_record_entry_items"
        ADD CONSTRAINT "CHK_medical_record_entry_items_kind"
        CHECK ("kind" IN ('PRESCRICAO', 'EXAME', 'ATESTADO', 'ENCAMINHAMENTO'))`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "medical_record_entry_items" DROP CONSTRAINT "CHK_medical_record_entry_items_kind"`,
    );
    // Linhas já gravadas de atestado/encaminhamento impedem reduzir o tipo; o down só vale sem elas.
    await queryRunner.query(
      `ALTER TABLE "medical_record_entry_items" ALTER COLUMN "kind" TYPE varchar(12)`,
    );
    await queryRunner.query(`
      ALTER TABLE "medical_record_entry_items"
        ADD CONSTRAINT "CHK_medical_record_entry_items_kind"
        CHECK ("kind" IN ('PRESCRICAO', 'EXAME'))`);
  }
}
