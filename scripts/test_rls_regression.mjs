import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Lê o .env.local manualmente para carregar a service_key
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  });
}

const SUPABASE_URL = 'https://nnaadrcmrmkwxbxhzbcx.supabase.co';
const ANON_KEY = 'sb_publishable_Ol2D3B0-3w1_Yx3jNXBw7Q_atotIFir'; // Chave anônima pública
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ ERRO: SUPABASE_SERVICE_KEY não encontrada no .env.local');
  process.exit(1);
}

// Cliente com acesso anônimo
const anonClient = createClient(SUPABASE_URL, ANON_KEY);
// Cliente com acesso de administrador
const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY);

const TABLES = [
  'profiles', 'exercises', 'routines', 'student_assignments',
  'students_data', 'coaches_data', 'set_templates', 'workouts',
  'workout_items', 'workout_sets', 'workout_logs', 'set_logs',
  'exercise_feedback_logs', 'weight_history', 'evolution_photos'
];

async function runTests() {
  console.log('\n🔍 Iniciando Teste de Regressão RLS - Supabase...\n');
  console.log('Testando acesso programático anônimo e bloqueios de policies.\n');

  for (const table of TABLES) {
    console.log(`\nTestando tabela: \x1b[36m${table}\x1b[0m`);
    
    try {
      // 1. Teste de SELECT anônimo
      const { data: selectData, error: selectError } = await anonClient
        .from(table)
        .select('*')
        .limit(1);

      let selectStatus = '';
      if (selectError) {
        selectStatus = `\x1b[32m✅ Bloqueado (Bom)\x1b[0m: ${selectError.message}`;
      } else if (selectData && selectData.length > 0) {
        selectStatus = `\x1b[33m⚠️ WARN: Retornou ${selectData.length} registros anônimos (Verifique se é intencional)\x1b[0m`;
      } else {
        selectStatus = `\x1b[32m✅ RLS aplicou filtro (0 registros) ou tabela vazia\x1b[0m`;
      }

      // 2. Teste de INSERT anônimo
      // Tenta inserir um dado com formato fake. Se RLS estiver ativado, deve rejeitar antes mesmo de validar o schema
      const fakeData = { id: '00000000-0000-0000-0000-000000000000' }; 
      const { error: insertError } = await anonClient
        .from(table)
        .insert(fakeData);

      let insertStatus = '';
      if (insertError) {
         insertStatus = `\x1b[32m✅ Inserção bloqueada (Bom)\x1b[0m: ${insertError.message}`;
      } else {
         insertStatus = `\x1b[31m❌ FAIL: Inserção PERMITIDA (Vulnerabilidade Crítica!)\x1b[0m`;
         // Tentar limpar caso tenha inserido indevidamente
         await serviceClient.from(table).delete().eq('id', fakeData.id);
      }

      console.log(`  - SELECT Anônimo: ${selectStatus}`);
      console.log(`  - INSERT Anônimo: ${insertStatus}`);

    } catch (err) {
      console.log(`  - \x1b[31m❌ Erro ao testar tabela: ${err.message}\x1b[0m`);
    }
  }
  
  console.log('\n🎉 Testes concluídos! Executado de forma programática utilizando a API do Supabase.\n');
}

runTests();
