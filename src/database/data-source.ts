import 'dotenv/config';
import { DataSource } from 'typeorm';

// Usado apenas pela CLI do TypeORM, sobre o código compilado (dist).
export default new DataSource({
  type: 'postgres',
  uuidExtension: 'pgcrypto',
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  username: process.env.DATABASE_USER,
  password: String(process.env.DATABASE_PASSWORD),
  database: process.env.DATABASE_NAME,
  entities: [`${import.meta.dirname}/../**/*.entity.js`],
  migrations: [`${import.meta.dirname}/migrations/*.js`],
});
