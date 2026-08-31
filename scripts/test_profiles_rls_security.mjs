import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey || !anonKey) {
  console.error('❌ Faltam variáveis de ambiente');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function runFullSecuritySuite() {
  console.log('================================================================');
  console.log('🔒 EXECUTANDO SUÍTE COMPLETA DE AUDITORIA DE SEGURANÇA');
  console.log('================================================================\n');

  // 1. Obter aluno
  const { data: students } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('role', 'student')
    .limit(1);

  const student = students[0];
  console.log(`📌 Aluno alvo: ${student.email} (ID: ${student.id}) | Role: ${student.role} | Status: ${student.status}`);

  // 2. Gerar sessão de autenticação
  const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: student.email
  });

  const studentClient = createClient(supabaseUrl, anonKey);
  await studentClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink'
  });

  let passed = 0;
  let total = 5;

  // CENÁRIO 1: Tentativa de virar ADMIN
  console.log('\n🧪 CENÁRIO 1: Aluno tentando update({ role: "admin" })');
  const { error: errRoleAdmin } = await studentClient
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', student.id);

  if (errRoleAdmin && errRoleAdmin.code === '42501') {
    console.log(`✅ [PASS] Bloqueado com erro 42501: "${errRoleAdmin.message}"`);
    passed++;
  } else {
    console.error(`❌ [FAIL] Falha no bloqueio:`, errRoleAdmin);
  }

  // CENÁRIO 2: Tentativa de virar COACH
  console.log('\n🧪 CENÁRIO 2: Aluno tentando update({ role: "coach" })');
  const { error: errRoleCoach } = await studentClient
    .from('profiles')
    .update({ role: 'coach' })
    .eq('id', student.id);

  if (errRoleCoach && errRoleCoach.code === '42501') {
    console.log(`✅ [PASS] Bloqueado com erro 42501: "${errRoleCoach.message}"`);
    passed++;
  } else {
    console.error(`❌ [FAIL] Falha no bloqueio:`, errRoleCoach);
  }

  // CENÁRIO 3: Tentativa de mudar STATUS para valor não autorizado
  console.log('\n🧪 CENÁRIO 3: Aluno tentando alterar status (status="banned")');
  const targetStatus = student.status === 'banned' ? 'pending' : 'banned';
  const { error: errStatus } = await studentClient
    .from('profiles')
    .update({ status: targetStatus })
    .eq('id', student.id);

  if (errStatus && errStatus.code === '42501') {
    console.log(`✅ [PASS] Bloqueado com erro 42501: "${errStatus.message}"`);
    passed++;
  } else {
    console.error(`❌ [FAIL] Falha no bloqueio de status:`, errStatus);
  }

  // CENÁRIO 4: Tentativa de mudar o ID do perfil
  console.log('\n🧪 CENÁRIO 4: Aluno tentando alterar o ID');
  const { error: errId } = await studentClient
    .from('profiles')
    .update({ id: '00000000-0000-0000-0000-000000000000' })
    .eq('id', student.id);

  if (errId) {
    console.log(`✅ [PASS] Bloqueado: "${errId.message}"`);
    passed++;
  } else {
    console.error(`❌ [FAIL] Falha no bloqueio de alteração de ID:`, errId);
  }

  // CENÁRIO 5: Atualização permitida de dados cadastrais legítimos
  console.log('\n🧪 CENÁRIO 5: Aluno atualizando dados permitidos (full_name, phone, preferences)');
  const updatedName = student.full_name || 'Nome Aluno';
  const { data: okData, error: errOk } = await studentClient
    .from('profiles')
    .update({
      full_name: updatedName,
      phone: '(11) 99999-8888',
      preferences: { focusMode: true, validated: true }
    })
    .eq('id', student.id)
    .select();

  if (!errOk && okData?.length > 0) {
    console.log(`✅ [PASS] Operação legítima concluída com sucesso! (Nome: ${okData[0].full_name})`);
    passed++;
  } else {
    console.error(`❌ [FAIL] Operação legítima falhou:`, errOk);
  }

  console.log('\n================================================================');
  console.log(`🏆 RESULTADO FINAL: ${passed}/${total} CENÁRIOS DE SEGURANÇA PASSARAM`);
  console.log('================================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runFullSecuritySuite().catch(err => {
  console.error(err);
  process.exit(1);
});
