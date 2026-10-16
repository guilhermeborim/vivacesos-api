import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateRecordAuditLogs1772100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'record_audit_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          { name: 'clinicId', type: 'uuid', isNullable: false },
          { name: 'userId', type: 'uuid', isNullable: false },
          { name: 'role', type: 'varchar', isNullable: false },
          { name: 'patientId', type: 'uuid', isNullable: true },
          { name: 'entryId', type: 'uuid', isNullable: true },
          {
            name: 'action',
            type: 'enum',
            enum: ['VIEW_RECORD', 'CREATE_ENTRY', 'CANCEL_ENTRY', 'VIEW_AUDIT'],
            enumName: 'record_audit_action_enum',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_record_audit_logs_clinic_created',
            columnNames: ['clinicId', 'createdAt'],
          }),
          new TableIndex({
            name: 'IDX_record_audit_logs_patient',
            columnNames: ['patientId'],
          }),
        ],
      }),
    );

    await queryRunner.createForeignKeys('record_audit_logs', [
      new TableForeignKey({
        name: 'FK_record_audit_logs_clinicId',
        columnNames: ['clinicId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'clinics',
        onDelete: 'RESTRICT',
      }),
      new TableForeignKey({
        name: 'FK_record_audit_logs_userId',
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'RESTRICT',
      }),
      new TableForeignKey({
        name: 'FK_record_audit_logs_patientId',
        columnNames: ['patientId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'patients',
        onDelete: 'RESTRICT',
      }),
    ]);

    // Auditoria é só inserção.
    await queryRunner.query(`
      CREATE FUNCTION record_audit_logs_immutable() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'A auditoria não pode ser alterada nem apagada';
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_record_audit_logs_immutable
      BEFORE UPDATE OR DELETE ON record_audit_logs
      FOR EACH ROW EXECUTE FUNCTION record_audit_logs_immutable();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS trg_record_audit_logs_immutable ON record_audit_logs',
    );
    await queryRunner.query(
      'DROP FUNCTION IF EXISTS record_audit_logs_immutable()',
    );
    await queryRunner.dropTable('record_audit_logs', true);
    await queryRunner.query('DROP TYPE IF EXISTS "record_audit_action_enum"');
  }
}
