import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateAppointmentTable1771600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'appointments',
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
          { name: 'professionalId', type: 'uuid', isNullable: false },
          { name: 'startsAt', type: 'timestamptz', isNullable: false },
          { name: 'endsAt', type: 'timestamptz', isNullable: false },
          {
            name: 'status',
            type: 'enum',
            enum: [
              'AGENDADA',
              'CONFIRMADA',
              'CONCLUIDA',
              'CANCELADA',
              'FALTOU',
            ],
            enumName: 'appointment_status_enum',
            isNullable: false,
            default: "'AGENDADA'",
          },
          { name: 'notes', type: 'text', isNullable: true, default: null },
          {
            name: 'createdAt',
            type: 'timestamptz',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_appointments_clinic_start',
            columnNames: ['clinicId', 'startsAt'],
          }),
          new TableIndex({
            name: 'IDX_appointments_professional_start',
            columnNames: ['professionalId', 'startsAt'],
          }),
        ],
      }),
    );

    await queryRunner.createForeignKeys('appointments', [
      new TableForeignKey({
        name: 'FK_appointments_clinicId',
        columnNames: ['clinicId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'clinics',
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_appointments_patientId',
        columnNames: ['patientId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'patients',
        onDelete: 'RESTRICT',
      }),
      new TableForeignKey({
        name: 'FK_appointments_professionalId',
        columnNames: ['professionalId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'professionals',
        onDelete: 'RESTRICT',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('appointments', true);
    await queryRunner.query('DROP TYPE IF EXISTS "appointment_status_enum"');
  }
}
