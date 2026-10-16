import 'dotenv/config';
import pg from 'pg';

// Apaga os dados de todas as tabelas do schema public, mantendo a estrutura
// e a tabela de migrations. Uso: yarn db:reset --yes

if (process.env.NODE_ENV?.toLowerCase() === 'production') {
  console.error('Recusado: NODE_ENV=production.');
  process.exit(1);
}

if (!process.argv.includes('--yes')) {
  console.error('Isso apaga TODOS os dados. Rode com --yes para confirmar.');
  process.exit(1);
}

const client = new pg.Client({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  user: process.env.DATABASE_USER,
  password: String(process.env.DATABASE_PASSWORD),
  database: process.env.DATABASE_NAME,
});

await client.connect();
try {
  const { rows } = await client.query(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = 'public' AND tablename <> 'migrations'`,
  );
  if (rows.length === 0) {
    console.log('Nenhuma tabela encontrada.');
  } else {
    const tables = rows.map((r) => `"public"."${r.tablename}"`).join(', ');
    await client.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
    console.log(`Dados apagados de ${rows.length} tabelas em "${process.env.DATABASE_NAME}".`);
  }
} finally {
  await client.end();
}
