import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Client } = pg;

async function apply() {
  const connectionString = process.env.DATABASE_URL || process.argv[2];

  if (!connectionString) {
    console.error('❌ Erro: Forneça a connection string ou defina DATABASE_URL no .env.local');
    console.error('Exemplo de uso: node scripts/apply_migration.mjs "postgresql://postgres.nnaadrcmrmkwxbxhzbcx:SENHA@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"');
    process.exit(1);
  }

  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20260831000000_fix_profiles_privilege_escalation.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('🔌 Conectando ao banco PostgreSQL do Supabase...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conexão estabelecida com sucesso!');
    console.log('🚀 Executando migração de segurança...');

    await client.query(sql);

    console.log('🎉 Migração aplicada com sucesso no banco de dados!');
  } catch (err) {
    console.error('❌ Erro ao aplicar migração:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

apply();
