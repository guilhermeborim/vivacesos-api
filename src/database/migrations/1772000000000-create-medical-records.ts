import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
  TableUnique,
} from 'typeorm';

export class CreateMedicalRecords1772000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'medical_records',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          { name: 'clinicId', type: 'uuid', isNullable: false },
          { name: 'patientId', type: 'uuid', isNullable: false },
          {
            name: 'createdAt',
            type: 'timestamptz',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        uniques: [
          new TableUnique({
            name: 'UQ_medical_records_clinic_patient',
            columnNames: ['clinicId', 'patientId'],
          }),
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'medical_record_entries',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          { name: 'clinicId', type: 'uuid', isNullable: false },
          { name: 'recordId', type: 'uuid', isNullable: false },
          { name: 'appointmentId', type: 'uuid', isNullable: false },
          { name: 'professionalId', type: 'uuid', isNullable: false },
          { name: 'parentEntryId', type: 'uuid', isNullable: true },
          { name: 'content', type: 'text', isNullable: false },
          {
            name: 'status',
            type: 'enum',
            enum: ['ATIVA', 'CANCELADA'],
            enumName: 'medical_record_entry_status_enum',
            isNullable: false,
            default: "'ATIVA'",
          },
          { name: 'cancelReason', type: 'text', isNullable: true },
          { name: 'canceledAt', type: 'timestamptz', isNullable: true },
          {
            name: 'createdAt',
            type: 'timestamptz',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_medical_record_entries_record_created',
            columnNames: ['recordId', 'createdAt'],
          }),
        ],
      }),
    );

    // Prontuário nunca é apagado: RESTRICT em todas as chaves.
    await queryRunner.createForeignKeys('medical_records', [
      new TableForeignKey({
        name: 'FK_medical_records_clinicId',
        columnNames: ['clinicId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'clinics',
        onDelete: 'RESTRICT',
      }),
      new TableForeignKey({
        name: 'FK_medical_records_patientId',
        columnNames: ['patientId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'patients',
        onDelete: 'RESTRICT',
      }),
    ]);
    await queryRunner.createForeignKeys('medical_record_entries', [
      new TableForeignKey({
        name: 'FK_medical_record_entries_clinicId',
        columnNames: ['clinicId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'clinics',
        onDelete: 'RESTRICT',
      }),
      new TableForeignKey({
        name: 'FK_medical_record_entries_recordId',
        columnNames: ['recordId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'medical_records',
        onDelete: 'RESTRICT',
      }),
      new TableForeignKey({
        name: 'FK_medical_record_entries_appointmentId',
        columnNames: ['appointmentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'appointments',
        onDelete: 'RESTRICT',
      }),
      new TableForeignKey({
        name: 'FK_medical_record_entries_professionalId',
        columnNames: ['professionalId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'professionals',
        onDelete: 'RESTRICT',
      }),
      new TableForeignKey({
        name: 'FK_medical_record_entries_parentEntryId',
        columnNames: ['parentEntryId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'medical_record_entries',
        onDelete: 'RESTRICT',
      }),
    ]);

    // Imutabilidade no banco: sem DELETE; ficha só muda de ATIVA para CANCELADA.
    await queryRunner.query(`
      CREATE FUNCTION medical_records_block_delete() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'Prontuários e fichas não podem ser apagados';
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE FUNCTION medical_record_entries_guard_update() RETURNS trigger AS $$
      BEGIN
        IF OLD.status = 'CANCELADA' THEN
          RAISE EXCEPTION 'Ficha cancelada não pode ser alterada';
        END IF;
        IF NEW."id" IS DISTINCT FROM OLD."id"
          OR NEW."clinicId" IS DISTINCT FROM OLD."clinicId"
          OR NEW."recordId" IS DISTINCT FROM OLD."recordId"
          OR NEW."appointmentId" IS DISTINCT FROM OLD."appointmentId"
          OR NEW."professionalId" IS DISTINCT FROM OLD."professionalId"
          OR NEW."parentEntryId" IS DISTINCT FROM OLD."parentEntryId"
          OR NEW."content" IS DISTINCT FROM OLD."content"
          OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN
          RAISE EXCEPTION 'Ficha não pode ser editada, apenas cancelada';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_medical_records_no_delete
      BEFORE DELETE ON medical_records
      FOR EACH ROW EXECUTE FUNCTION medical_records_block_delete();
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_medical_record_entries_no_delete
      BEFORE DELETE ON medical_record_entries
      FOR EACH ROW EXECUTE FUNCTION medical_records_block_delete();
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_medical_record_entries_guard_update
      BEFORE UPDATE ON medical_record_entries
      FOR EACH ROW EXECUTE FUNCTION medical_record_entries_guard_update();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS trg_medical_record_entries_guard_update ON medical_record_entries',
    );
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS trg_medical_record_entries_no_delete ON medical_record_entries',
    );
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS trg_medical_records_no_delete ON medical_records',
    );
    await queryRunner.query(
      'DROP FUNCTION IF EXISTS medical_record_entries_guard_update()',
    );
    await queryRunner.query(
      'DROP FUNCTION IF EXISTS medical_records_block_delete()',
    );
    await queryRunner.dropTable('medical_record_entries', true);
    await queryRunner.dropTable('medical_records', true);
    await queryRunner.query(
      'DROP TYPE IF EXISTS "medical_record_entry_status_enum"',
    );
  }
}
