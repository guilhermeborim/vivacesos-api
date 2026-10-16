import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAppointmentPrice1771700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('appointments', [
      new TableColumn({
        name: 'price',
        type: 'numeric',
        precision: 10,
        scale: 2,
        isNullable: false,
        default: 0,
      }),
      new TableColumn({
        name: 'paid',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('appointments', ['price', 'paid']);
  }
}
