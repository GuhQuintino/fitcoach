/**
 * generate_all_student_dossiers.mjs
 * 
 * Executa uma varredura histórica completa em ambos os bancos (Fitcoach e Questionários)
 * e gera/atualiza os dossiês (.md) de TODOS os alunos (ativos e inativos), consolidando:
 * - Anamneses completas (dados pessoais, objetivos, histórico de dores, lesões, rotina, nutrição, sono)
 * - Histórico completo de check-ins (sono, adesão, queixas, relatos)
 * - Rotina atual prescrita (exercícios, séries, metas)
 * - Histórico de treinos e feedbacks textuais deixados nos logs
 * - Recordes pessoais (PRs) e cargas máximas já registradas por exercício
 * - Padrões de equipamentos deduzidos (degraus de cargas, halteres, placas)
 * 
 * - Histórico de conversas de texto e transcrições de áudios do WhatsApp Web (.whatsapp_cache/{slug}.json)
 * 
 * Uso:
 *   node generate_all_student_dossiers.mjs [--sync-whatsapp] [--student="Nome"] [--days=N]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import {
  formatWhatsAppSectionMarkdown,
  loadWhatsAppCacheFile,
  matchStudentAnamneseAndCrm,
} from './whatsapp_utils.mjs';
import {
  formatAnamneseDossierLines,
  normalizeAnamneseContent,
} from './anamnese_utils.mjs';
import { syncWhatsAppHistory } from './sync_whatsapp_history.mjs';

const { Client } = pg;

function parseEnv(filePath) {
  if (!existsSync(filePath)) return {};
  const content = readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const FITCOACH_DIR = resolve('C:/Users/Gustavo/Desktop/Fitcoach');
const QUESTIONARIOS_DIR = resolve('C:/Users/Gustavo/Desktop/Questionários');
const STUDENTS_DOCS_DIR = join(FITCOACH_DIR, 'docs', 'students');
const WHATSAPP_CACHE_DIR = join(STUDENTS_DOCS_DIR, '.whatsapp_cache');

const args = process.argv.slice(2);
const shouldSyncWhatsApp = args.includes('--sync-whatsapp') || args.includes('--with-whatsapp');
let cliStudentFilter = null;
let cliOverrideDays = null;
for (const arg of args) {
  if (arg.startsWith('--student=')) {
    cliStudentFilter = arg.split('=')[1].trim().replace(/^["']|["']$/g, '');
  } else if (arg.startsWith('--days=')) {
    cliOverrideDays = parseInt(arg.split('=')[1], 10) || null;
  }
}

const fitcoachEnv = parseEnv(join(FITCOACH_DIR, '.env.local'));
const questionariosEnv = parseEnv(join(QUESTIONARIOS_DIR, '.env.local'));

const FITCOACH_DB_URL = fitcoachEnv.DATABASE_URL;
const QUESTIONARIOS_DB_URL = questionariosEnv.DATABASE_URL;

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function formatDate(d) {
  if (!d) return '—';
  try {
    const date = new Date(d);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return String(d);
  }
}

function cleanPhone(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

async function run() {
  if (shouldSyncWhatsApp) {
    console.log('=== Sincronizando Histórico do WhatsApp Web antes de gerar dossiês ===');
    await syncWhatsAppHistory({
      studentFilter: cliStudentFilter,
      overrideDays: cliOverrideDays,
    });
  }

  const clientF = new Client({ connectionString: FITCOACH_DB_URL });
  const clientQ = new Client({ connectionString: QUESTIONARIOS_DB_URL });

  console.log('=== Iniciando Varredura Histórica Completa de Alunos ===');

  try {
    await clientF.connect();
    await clientQ.connect();

    // 1. Buscar todos os perfis de alunos no Fitcoach (deduplicando por ID de perfil)
    const resProfiles = await clientF.query(`
      SELECT 
        p.id, 
        p.full_name, 
        p.email, 
        p.created_at,
        sa.routine_id, 
        sa.is_active as assignment_active, 
        r.name as routine_name
      FROM profiles p
      LEFT JOIN LATERAL (
        SELECT routine_id, is_active 
        FROM student_assignments 
        WHERE student_id = p.id 
        ORDER BY is_active DESC, started_at DESC NULLS LAST, created_at DESC 
        LIMIT 1
      ) sa ON true
      LEFT JOIN routines r ON r.id = sa.routine_id
      WHERE p.role = 'student'
      ORDER BY p.full_name ASC;
    `);

    // 2. Buscar todos os alunos, anamneses e respostas no Questionários
    const resCrmAlunos = await clientQ.query(`
      SELECT id, nome, telefone, fitcoach_student_id, criado_em
      FROM aluno;
    `);

    const resAnamneses = await clientQ.query(`
      SELECT id, aluno_id, schema_version, content, status, created_at, updated_at
      FROM anamneses
      ORDER BY created_at DESC;
    `);

    const resCheckins = await clientQ.query(`
      SELECT rq.id, rq.aluno_id, rq.tipo, rq.respostas, rq.submetido_em, rq.revisado
      FROM resposta_questionario rq
      ORDER BY rq.submetido_em ASC;
    `);

    // Indexar Questionários
    const crmByFitcoachId = new Map();
    const crmByName = new Map();
    for (const a of resCrmAlunos.rows) {
      if (a.fitcoach_student_id) crmByFitcoachId.set(a.fitcoach_student_id, a);
      if (a.nome) crmByName.set(a.nome.trim().toLowerCase(), a);
    }

    const checkinsByCrmId = new Map();
    for (const c of resCheckins.rows) {
      if (!checkinsByCrmId.has(c.aluno_id)) {
        checkinsByCrmId.set(c.aluno_id, []);
      }
      checkinsByCrmId.get(c.aluno_id).push(c);
    }

    // 3. Buscar todas as rotinas prescritas no Fitcoach
    const routineIds = Array.from(new Set(resProfiles.rows.map(r => r.routine_id).filter(Boolean)));
    const routineDetailsMap = new Map();

    if (routineIds.length > 0) {
      const resRoutines = await clientF.query(`
        SELECT 
          w.routine_id,
          w.id as workout_id,
          w.name as workout_name,
          w.order_index as workout_order,
          wi.id as workout_item_id,
          wi.order_index as item_order,
          wi.coach_notes,
          e.id as exercise_id,
          e.name as exercise_name,
          e.muscle_group,
          ws.id as set_id,
          ws.set_order,
          ws.type as set_type,
          ws.reps_target,
          ws.weight_target,
          ws.rest_seconds,
          ws.rpe_target
        FROM workouts w
        JOIN workout_items wi ON wi.workout_id = w.id
        JOIN exercises e ON e.id = wi.exercise_id
        LEFT JOIN workout_sets ws ON ws.workout_item_id = wi.id
        WHERE w.routine_id = ANY($1::uuid[])
        ORDER BY w.order_index ASC, wi.order_index ASC, ws.set_order ASC;
      `, [routineIds]);

      for (const row of resRoutines.rows) {
        if (!routineDetailsMap.has(row.routine_id)) {
          routineDetailsMap.set(row.routine_id, new Map());
        }
        const wMap = routineDetailsMap.get(row.routine_id);
        if (!wMap.has(row.workout_id)) {
          wMap.set(row.workout_id, {
            name: row.workout_name,
            items: new Map()
          });
        }
        const iMap = wMap.get(row.workout_id).items;
        if (!iMap.has(row.workout_item_id)) {
          iMap.set(row.workout_item_id, {
            exerciseName: row.exercise_name,
            muscleGroup: row.muscle_group,
            coachNotes: row.coach_notes,
            sets: []
          });
        }
        if (row.set_id) {
          iMap.get(row.workout_item_id).sets.push({
            order: row.set_order,
            type: row.set_type,
            repsTarget: row.reps_target,
            weightTarget: row.weight_target,
            restSeconds: row.rest_seconds,
            rpeTarget: row.rpe_target
          });
        }
      }
    }

    // 4. Buscar histórico de treinos e séries de todos os alunos no Fitcoach
    const resLogs = await clientF.query(`
      SELECT 
        wl.id as workout_log_id,
        wl.student_id,
        wl.started_at,
        wl.finished_at,
        wl.effort_rating,
        wl.feedback_notes,
        w.name as workout_name
      FROM workout_logs wl
      LEFT JOIN workouts w ON w.id = wl.workout_id
      ORDER BY wl.started_at ASC;
    `);

    const logsByStudentId = new Map();
    for (const log of resLogs.rows) {
      if (!logsByStudentId.has(log.student_id)) {
        logsByStudentId.set(log.student_id, []);
      }
      logsByStudentId.get(log.student_id).push(log);
    }

    // Buscar todas as séries históricas com carga
    const resSetLogs = await clientF.query(`
      SELECT 
        sl.workout_log_id,
        wl.student_id,
        sl.exercise_id,
        e.name as exercise_name,
        e.muscle_group,
        sl.set_type,
        sl.weight_kg,
        sl.reps_completed,
        sl.rpe_actual,
        sl.completed_at
      FROM set_logs sl
      JOIN workout_logs wl ON wl.id = sl.workout_log_id
      JOIN exercises e ON e.id = sl.exercise_id
      WHERE sl.weight_kg IS NOT NULL AND sl.weight_kg > 0
      ORDER BY sl.completed_at ASC;
    `);

    // Mapear PRs e cargas históricas por aluno
    const exerciseHistoryByStudent = new Map();
    for (const row of resSetLogs.rows) {
      if (!exerciseHistoryByStudent.has(row.student_id)) {
        exerciseHistoryByStudent.set(row.student_id, new Map());
      }
      const exMap = exerciseHistoryByStudent.get(row.student_id);
      if (!exMap.has(row.exercise_name)) {
        exMap.set(row.exercise_name, {
          muscleGroup: row.muscle_group,
          maxWeight: 0,
          maxWeightReps: 0,
          maxWeightDate: null,
          lastWeight: 0,
          lastReps: 0,
          lastDate: null,
          lastRpe: null,
          totalSets: 0,
          weightsSet: new Set()
        });
      }
      const ex = exMap.get(row.exercise_name);
      ex.totalSets++;
      ex.weightsSet.add(parseFloat(row.weight_kg));
      const w = parseFloat(row.weight_kg);

      if (w > ex.maxWeight) {
        ex.maxWeight = w;
        ex.maxWeightReps = row.reps_completed;
        ex.maxWeightDate = row.completed_at;
      }
      ex.lastWeight = w;
      ex.lastReps = row.reps_completed;
      ex.lastDate = row.completed_at;
      ex.lastRpe = row.rpe_actual;
    }

    // 5. Consolidar lista de todos os alunos (Fitcoach + CRM)
    const processedSlugs = new Set();
    const processedFitcoachIds = new Set();
    const processedCrmIds = new Set();
    const allStudentsList = [];

    // Incluir alunos do Fitcoach
    for (const p of resProfiles.rows) {
      const rawName = p.full_name.trim();
      if (rawName.toLowerCase().startsWith('aluno teste') || rawName.toLowerCase() === 'coach teste') {
        continue;
      }
      const slug = slugify(rawName);
      processedSlugs.add(slug);
      processedFitcoachIds.add(p.id);

      // Correlacionar CRM e Anamnese (insensível a diacríticos/acentos, caixa, telefone e e-mail)
      const { crmAluno, anamnese, phone } = matchStudentAnamneseAndCrm(
        { fitcoachId: p.id, name: rawName, email: p.email },
        resCrmAlunos.rows,
        resAnamneses.rows
      );
      if (crmAluno) {
        processedCrmIds.add(crmAluno.id);
      }

      const checkins = crmAluno ? (checkinsByCrmId.get(crmAluno.id) || []) : [];
      const logs = logsByStudentId.get(p.id) || [];
      const exHistory = exerciseHistoryByStudent.get(p.id) || new Map();

      allStudentsList.push({
        slug,
        name: rawName,
        email: p.email,
        fitcoachId: p.id,
        crmId: crmAluno?.id || null,
        phone,
        routineId: p.routine_id,
        routineName: p.routine_name,
        isActive: p.assignment_active ?? false,
        createdAt: p.created_at,
        anamnese,
        checkins,
        logs,
        exHistory,
      });
    }

    // Incluir alunos que estão no CRM mas não estavam no Fitcoach
    for (const c of resCrmAlunos.rows) {
      const rawName = c.nome.trim();
      const slug = slugify(rawName);
      if (processedSlugs.has(slug)) continue;
      if (processedCrmIds.has(c.id)) continue;
      if (c.fitcoach_student_id && processedFitcoachIds.has(c.fitcoach_student_id)) continue;
      if (rawName.toLowerCase().startsWith('aluno teste') || rawName.toLowerCase() === 'teste') continue;

      processedSlugs.add(slug);
      processedCrmIds.add(c.id);

      const { anamnese, phone } = matchStudentAnamneseAndCrm(
        { fitcoachId: c.fitcoach_student_id || null, crmId: c.id, name: rawName, phone: c.telefone },
        resCrmAlunos.rows,
        resAnamneses.rows
      );
      const checkins = checkinsByCrmId.get(c.id) || [];

      allStudentsList.push({
        slug,
        name: rawName,
        email: null,
        fitcoachId: c.fitcoach_student_id || null,
        crmId: c.id,
        phone,
        routineId: null,
        routineName: null,
        isActive: false,
        createdAt: c.criado_em,
        anamnese,
        checkins,
        logs: [],
        exHistory: new Map(),
      });
    }

    const normalizedFilter = cliStudentFilter
      ? cliStudentFilter
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
      : null;

    const targetStudentsList = normalizedFilter
      ? allStudentsList.filter((st) => {
          const stNorm = st.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
          return (
            st.fitcoachId === cliStudentFilter ||
            st.crmId === cliStudentFilter ||
            st.slug === slugify(cliStudentFilter) ||
            stNorm.includes(normalizedFilter)
          );
        })
      : allStudentsList;

    console.log(
      `Total de alunos a documentar: ${targetStudentsList.length}${
        cliStudentFilter ? ` (filtro: "${cliStudentFilter}" de ${allStudentsList.length})` : ''
      }`,
    );

    // 6. Gerar Markdown de cada Dossiê
    const { countDossiersGenerated } = await generateDossiersFromData(targetStudentsList, {
      outputDir: STUDENTS_DOCS_DIR,
      whatsappCacheDir: WHATSAPP_CACHE_DIR,
    });

    console.log(`\n=== Varredura concluída com sucesso! Total de Dossiês gerados: ${countDossiersGenerated} ===`);

  } catch (err) {
    console.error('[ERRO FATAL NA GERAÇÃO DE DOSSIÊS]:', err);
    process.exit(1);
  } finally {
    await clientF.end();
    await clientQ.end();
  }
}

export function buildStudentDossierMarkdown(
  st,
  { whatsappCacheDir = WHATSAPP_CACHE_DIR, nowISO = new Date().toISOString() } = {},
) {
  const c = st.anamnese?.content || {};
  const exHistory = st.exHistory instanceof Map ? st.exHistory : new Map();
  const logs = Array.isArray(st.logs) ? st.logs : [];
  const checkins = Array.isArray(st.checkins) ? st.checkins : [];

  // Deduzir física da academia através das cargas
  const allWeights = [];
  for (const ex of exHistory.values()) {
    for (const w of ex.weightsSet) allWeights.push(w);
  }
  allWeights.sort((a, b) => a - b);

  const hasHalfKg = allWeights.some(w => w % 1 !== 0);
  const minWeight = allWeights.length > 0 ? allWeights[0] : null;
  const maxWeight = allWeights.length > 0 ? allWeights[allWeights.length - 1] : null;

  // Extrair queixas e notas de feedback históricas
  const feedbacksComTexto = logs.filter(l => l.feedback_notes && l.feedback_notes.trim().length > 0);

  // Montar Dossiê Markdown
  let md = `# Dossiê de Acompanhamento — ${st.name}\n\n`;
  md += `> **ID Fitcoach:** \`${st.fitcoachId || 'Não vinculado'}\`  \n`;
  md += `> **ID Questionários (CRM):** \`${st.crmId || 'Não vinculado'}\`  \n`;
  md += `> **Telefone/WhatsApp:** ${st.phone || c.whatsapp || 'Não informado'}  \n`;
  md += `> **E-mail:** ${st.email || 'Não informado'}  \n`;
  md += `> **Status:** ${st.isActive ? '🟢 Ativo' : '⚪ Inativo / Histórico'} | **Rotina:** ${st.routineName || 'Nenhuma rotina vinculada'}  \n`;
  md += `> **Última Atualização:** ${nowISO.slice(0, 10)}  \n\n`;
  md += `---\n\n`;

  // 1. Perfil Biomecânico & Anamnese
  const anamneseSummary = st.anamnese ? normalizeAnamneseContent(c) : null;
  md += `## 1. Perfil Biomecânico & Anamnese\n`;
  if (st.anamnese && anamneseSummary) {
    md += `- **Data da Anamnese:** ${formatDate(st.anamnese.created_at)} ${c.selectedPlan ? `(Plano: **${c.selectedPlan.toUpperCase()}**)` : ''}\n`;
    md += formatAnamneseDossierLines(anamneseSummary).join('\n') + '\n';
    if (c.dietRestrictions) {
      md += `- **Restrições / Horários Alimentares:** ${c.dietRestrictions.replace(/\n+/g, ' ')}\n`;
    }
    if (c.expectations) {
      md += `- **Expectativas Declaradas:** *"${c.expectations.replace(/\n+/g, ' ')}"* (Origem: ${c.howFoundMe || 'Não informado'})\n`;
    }
  } else {
    md += `*Nenhuma anamnese registrada no Questionários. Perfil montado via histórico de treinos e check-ins.*\n`;
  }
  md += `\n---\n\n`;

  // 2. Mapa de Equipamentos & Física da Academia do Aluno
  md += `## 2. Mapa de Equipamentos & Física da Academia do Aluno\n`;
  md += `*Padrões combinados da anamnese e dos logs de treino registrados:*\n`;
  if (anamneseSummary) {
    md += `- **Local & Setup Declarado:** ${anamneseSummary.equipamentos.ambienteResumo}\n`;
    if (anamneseSummary.equipamentos.maquinasConfirmadas.length > 0) {
      md += `- **Máquinas Confirmadas:** ${anamneseSummary.equipamentos.maquinasConfirmadas.map((m) => m.nome).join(', ')}\n`;
    }
    if (anamneseSummary.equipamentos.maquinasAusentes.length > 0) {
      md += `- **Máquinas Indisponíveis:** ${anamneseSummary.equipamentos.maquinasAusentes.map((m) => m.nome).join(', ')}\n`;
    }
    if (anamneseSummary.equipamentos.maquinasNaoSabe.length > 0) {
      md += `- **Máquinas a Confirmar ("Não sei"):** ${anamneseSummary.equipamentos.maquinasNaoSabe.map((m) => m.nome).join(', ')}\n`;
    }
    if (anamneseSummary.equipamentos.outrosEquipamentos.length > 0) {
      md += `- **Pesos Livres / Condomínio / Casa:** ${anamneseSummary.equipamentos.outrosEquipamentos.join(', ')}\n`;
    }
    md += `- **Saltos de Carga Declarados:** ${anamneseSummary.preferenciasELogistica.incrementoMinimoPeso} | **Spotter:** ${anamneseSummary.preferenciasELogistica.treinaComParceiro}\n`;
  }
  if (allWeights.length > 0) {
    md += `- **Faixa Histórica de Cargas:** Menor carga registrada: ${minWeight} kg | Maior carga: ${maxWeight} kg\n`;
    md += `- **Detecção de Frações:** ${hasHalfKg ? 'Utiliza cargas fracionárias (ex: 2.5kg, 7.5kg ou anilhas de 1kg/1.25kg).' : 'Cargas registradas majoritariamente em números inteiros (pares ou de 5 em 5kg).'}\n`;
  } else {
    md += `- *Sem registros suficientes de séries para mapear incrementos pelos logs ainda.*\n`;
  }
  md += `\n---\n\n`;

  // 3. Marcos de Carga Relevantes (PRs e Cargas Históricas)
  md += `## 3. Marcos de Carga Relevantes (Recordes Pessoais & Cargas Máximas)\n`;
  if (exHistory.size > 0) {
    md += `| Exercício | Grupo | Carga Máxima (PR) | Reps no PR | Data do PR | Última Carga Registrada | Total Séries Feitas |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    const sortedExercises = Array.from(exHistory.entries()).sort((a, b) => b[1].totalSets - a[1].totalSets);
    for (const [exName, data] of sortedExercises) {
      md += `| **${exName}** | ${data.muscleGroup || '—'} | **${data.maxWeight} kg** | ${data.maxWeightReps || '—'} reps | ${formatDate(data.maxWeightDate)} | ${data.lastWeight} kg (${data.lastReps || '—'} reps) | ${data.totalSets} |\n`;
    }
  } else {
    md += `*Nenhum registro de carga salvo no Fitcoach até o momento.*\n`;
  }
  md += `\n---\n\n`;

  // 4. Linha do Tempo e Histórico de Check-ins (Questionários)
  md += `## 4. Histórico de Check-ins & Avaliações (Questionários)\n`;
  md += `- **Total de Check-ins Submetidos:** ${checkins.length}\n`;
  if (checkins.length > 0) {
    md += `\n| Data | Tipo | Adesão (1-5) | Conforto (1-5) | Esforço | Sono (1-5) | DOMS (1-5) | NPS | Principais Justificativas & Relatos |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    for (const ch of checkins.slice(-10)) { // Últimos 10 check-ins
      const r = ch.respostas || {};
      const relatos = [];
      if (r.adesao_conforto_execucao_justificativa) relatos.push(`Conforto: "${r.adesao_conforto_execucao_justificativa}"`);
      if (r.intensidade_esforco_justificativa) relatos.push(`Esforço: "${r.intensidade_esforco_justificativa}"`);
      if (r.resultados_nps_justificativa) relatos.push(`NPS: "${r.resultados_nps_justificativa}"`);
      if (r.recuperacao_sono_justificativa) relatos.push(`Sono: "${r.recuperacao_sono_justificativa}"`);
      const relatoFormatado = relatos.length > 0 ? relatos.join(' • ') : '—';
      md += `| ${formatDate(ch.submetido_em)} | ${ch.tipo} | ${r.adesao_cronograma || '—'} | ${r.adesao_conforto_execucao || '—'} | ${r.intensidade_esforco || '—'} | ${r.recuperacao_sono || '—'} | ${r.recuperacao_doms || '—'} | ${r.resultados_nps || '—'} | ${relatoFormatado} |\n`;
    }
  } else {
    md += `*Nenhum check-in semanal ou mensal respondido ainda.*\n`;
  }
  md += `\n---\n\n`;

  // 5. Histórico de Feedbacks de Treino nos Logs do Fitcoach
  md += `## 5. Histórico de Feedbacks Textuais nos Treinos (Fitcoach)\n`;
  md += `- **Total de Treinos Registrados:** ${logs.length}\n`;
  if (feedbacksComTexto.length > 0) {
    md += `\n| Data do Treino | Treino | PSE (1-10) | Feedback do Aluno |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    for (const log of feedbacksComTexto) {
      md += `| ${formatDate(log.started_at)} | ${log.workout_name || 'Treino'} | ${log.effort_rating || '—'}/10 | *"${log.feedback_notes}"* |\n`;
    }
  } else {
    md += `*Nenhum comentário textual registrado nos treinos até o momento.*\n`;
  }
  md += `\n---\n\n`;

  // 6. Histórico de Conversas & Áudios (WhatsApp)
  const waCacheFile = whatsappCacheDir ? join(whatsappCacheDir, `${st.slug}.json`) : null;
  const waCacheData = waCacheFile ? loadWhatsAppCacheFile(waCacheFile) : null;
  md += formatWhatsAppSectionMarkdown(waCacheData, { maxMessages: 30 });
  md += `\n---\n\n`;

  // 7. Diretrizes e Próximos Passos
  md += `## 7. Diretrizes para Revisões Semanais da Skill\n`;
  if (anamneseSummary?.pendencias?.length) {
    md += `- **Pendências abertas da Anamnese (usar no 1º Check-in antes de ajustar):**\n`;
    for (const p of anamneseSummary.pendencias) {
      md += `  - [${p.severidade.toUpperCase()}] ${p.titulo} — ${p.motivo}\n`;
    }
  }
  if (anamneseSummary?.saudeERecuperacao?.alertasRevisaoTreinador?.length) {
    md += `- **Alertas clínicos ativos para revisão obrigatória do treinador:**\n`;
    for (const a of anamneseSummary.saudeERecuperacao.alertasRevisaoTreinador) {
      md += `  - ⚠️ ${a}\n`;
    }
  }
  md += `- Manter acompanhamento dos exercícios de maior sobrecarga axial e articular.\n`;
  md += `- Consultar esta ficha (incluindo relatos e áudios do WhatsApp na Seção 6) antes de sugerir novos aumentos de carga na rotina semanal.\n`;
  md += `- Ao realizar a revisão semanal aos domingos, registrar os ajustes aprovados pelo treinador nesta seção.\n`;

  const waCount = Array.isArray(waCacheData?.messages) ? waCacheData.messages.length : 0;
  return { markdown: md.trim() + '\n', waCount };
}

export async function generateDossiersFromData(
  studentsList,
  {
    outputDir = STUDENTS_DOCS_DIR,
    whatsappCacheDir = WHATSAPP_CACHE_DIR,
    nowISO = new Date().toISOString(),
    logger = console.log,
  } = {},
) {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  if (whatsappCacheDir && !existsSync(whatsappCacheDir)) {
    mkdirSync(whatsappCacheDir, { recursive: true });
  }

  let countDossiersGenerated = 0;
  const generatedFiles = [];

  for (const st of studentsList) {
    const slug = st.slug || slugify(st.name || '');
    const normalizedStudent = { ...st, slug };
    const { markdown, waCount } = buildStudentDossierMarkdown(normalizedStudent, {
      whatsappCacheDir,
      nowISO,
    });
    const targetPath = join(outputDir, `${slug}.md`);
    writeFileSync(targetPath, markdown, 'utf8');
    generatedFiles.push(targetPath);
    countDossiersGenerated++;
    const exSize = normalizedStudent.exHistory instanceof Map ? normalizedStudent.exHistory.size : 0;
    const logsLen = Array.isArray(normalizedStudent.logs) ? normalizedStudent.logs.length : 0;
    const checkinsLen = Array.isArray(normalizedStudent.checkins) ? normalizedStudent.checkins.length : 0;
    logger(
      `[OK] Dossiê gerado: ${normalizedStudent.name} -> ${slug}.md (Anamnese: ${normalizedStudent.anamnese ? 'SIM' : 'NÃO'} | Treinos: ${logsLen} | Checkins: ${checkinsLen} | WhatsApp: ${waCount} msgs | Exercícios: ${exSize})`,
    );
  }

  return { countDossiersGenerated, generatedFiles };
}

const isMainModule =
  process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (isMainModule) {
  run();
}
