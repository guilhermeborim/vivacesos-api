import { MigrationInterface, QueryRunner } from 'typeorm';

export class HashRefreshTokens1771500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" RENAME COLUMN "token" TO "tokenHash"`,
    );
    // Converte tokens existentes em SHA-256 hex (mesmo formato de hashRefreshToken).
    await queryRunner.query(
      `UPDATE "refresh_tokens" SET "tokenHash" = encode(sha256(convert_to("tokenHash", 'UTF8')), 'hex')`,
    );
  }

  // Irreversível: o token original não é recuperável a partir do hash.
  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
