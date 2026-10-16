import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotifications1772400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "clinicId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "type" varchar(50) NOT NULL,
        "title" varchar(150) NOT NULL,
        "message" varchar(500) NOT NULL,
        "link" varchar(200),
        "data" jsonb,
        "dedupeKey" varchar(150),
        "readAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_clinicId" FOREIGN KEY ("clinicId")
          REFERENCES "clinics"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notifications_userId" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_read_created" ON "notifications" ("userId", "readAt", "createdAt" DESC)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_notifications_user_dedupe" ON "notifications" ("userId", "dedupeKey") WHERE "dedupeKey" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
  }
}
