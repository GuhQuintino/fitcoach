/**
 * fetch_weekly_review.mjs
 * 
 * Script auxiliar para a skill weekly-workout-adjuster.
 * Conecta aos dois bancos (Fitcoach e Questionários) via session pooler (pg)
 * e extrai a telemetria semanal completa de treinos, cargas, RPE, feedbacks e check-ins.
 * 
 * Uso:
 *   node fetch_weekly_review.mjs [--days=7] [--student="Nome ou ID"] [--unread-only] [--sync-whatsapp]
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import {
  loadWhatsAppCacheFile,
  slugifyStudentName,
  matchStudentAnamneseAndCrm,
} from './whatsapp_utils.mjs';
import { normalizeAnamneseContent } from './anamnese_utils.mjs';
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

// Configurações dos caminhos dos projetos
const FITCOACH_DIR = resolve('C:/Users/Gustavo/Desktop/Fitcoach');
const QUESTIONARIOS_DIR = resolve('C:/Users/Gustavo/Desktop/Questionários');
const STUDENTS_DOCS_DIR = join(FITCOACH_DIR, 'docs', 'students');
const WHATSAPP_CACHE_DIR = join(STUDENTS_DOCS_DIR, '.whatsapp_cache');

const fitcoachEnv = parseEnv(join(FITCOACH_DIR, '.env.local'));
const questionariosEnv = parseEnv(join(QUESTIONARIOS_DIR, '.env.local'));

const FITCOACH_DB_URL = fitcoachEnv.DATABASE_URL;
const QUESTIONARIOS_DB_URL = questionariosEnv.DATABASE_URL;

// Parse args
const args = process.argv.slice(2);
let days = 7;
let studentFilter = null;
let unreadOnly = false;
let shouldSyncWhatsApp = false;

for (const arg of args) {
  if (arg.startsWith('--days=')) {
    days = parseInt(arg.split('=')[1], 10) || 7;
  } else if (arg.startsWith('--student=')) {
    studentFilter = arg.split('=')[1].trim().replace(/^["']|["']$/g, '').toLowerCase();
  } else if (arg === '--unread-only') {
    unreadOnly = true;
  } else if (arg === '--sync-whatsapp' || arg === '--with-whatsapp') {
    shouldSyncWhatsApp = true;
  }
}

async function run() {
  if (!FITCOACH_DB_URL) {
    console.error('[ERRO] DATABASE_URL não encontrada no .env.local do Fitcoach');
    process.exit(1);
  }

  if (shouldSyncWhatsApp) {
    await syncWhatsAppHistory({
      studentFilter,
      overrideDays: null,
    });
  }

  const clientF = new Client({ connectionString: FITCOACH_DB_URL });
  let clientQ = null;
  if (QUESTIONARIOS_DB_URL) {
    clientQ = new Client({ connectionString: QUESTIONARIOS_DB_URL });
  }

  try {
    await clientF.connect();
    if (clientQ) await clientQ.connect();

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const sinceISO = sinceDate.toISOString();

    // 1. Buscar alunos ativos no Fitcoach
    let queryStudents = `
      SELECT p.id, p.full_name, p.email, sa.routine_id, r.name as routine_name
      FROM profiles p
      LEFT JOIN student_assignments sa ON sa.student_id = p.id AND sa.is_active = true
      LEFT JOIN routines r ON r.id = sa.routine_id
      WHERE p.role = 'student'
    `;
    const paramsStudents = [];
    if (studentFilter) {
      queryStudents += ` AND (LOWER(p.full_name) LIKE $1 OR p.id::text = $1)`;
      paramsStudents.push(`%${studentFilter}%`);
    }
    queryStudents += ` ORDER BY p.full_name ASC;`;

    const resStudents = await clientF.query(queryStudents, paramsStudents);
    const studentsMap = new Map();

    for (const row of resStudents.rows) {
      studentsMap.set(row.id, {
        id: row.id,
        name: row.full_name,
        email: row.email,
        routineId: row.routine_id,
        routineName: row.routine_name,
        workoutsLogged: [],
        exerciseFeedbacks: [],
        progressionCandidates: [],
        prescribedRoutine: null,
        crmData: null,
        whatsappHistory: null,
        existingDossierPath: null,
      });
    }

    // 2. Buscar treinos executados no Fitcoach
    let queryLogs = `
      SELECT 
        wl.id as workout_log_id,
        wl.student_id,
        wl.workout_id,
        w.name as workout_name,
        wl.started_at,
        wl.finished_at,
        wl.effort_rating,
        wl.feedback_notes,
        wl.read_by_coach
      FROM workout_logs wl
      LEFT JOIN workouts w ON w.id = wl.workout_id
      WHERE wl.started_at >= $1
    `;
    const paramsLogs = [sinceISO];
    if (unreadOnly) {
      queryLogs += ` AND wl.read_by_coach = false`;
    }
    queryLogs += ` ORDER BY wl.started_at DESC;`;

    const resLogs = await clientF.query(queryLogs, paramsLogs);
    const logIds = resLogs.rows.map(r => r.workout_log_id);

    // 3. Buscar todas as séries (set_logs) executadas nesses treinos
    let setsByLogId = new Map();
    if (logIds.length > 0) {
      const resSets = await clientF.query(`
        SELECT 
          sl.id,
          sl.workout_log_id,
          sl.exercise_id,
          e.name as exercise_name,
          e.muscle_group,
          sl.set_type,
          sl.weight_kg,
          sl.reps_completed,
          sl.rpe_actual,
          sl.completed_at,
          sl.group_round,
          sl.execution_mode,
          sl.tempo_used
        FROM set_logs sl
        JOIN exercises e ON e.id = sl.exercise_id
        WHERE sl.workout_log_id = ANY($1::uuid[])
        ORDER BY sl.completed_at ASC, sl.id ASC;
      `, [logIds]);

      for (const row of resSets.rows) {
        if (!setsByLogId.has(row.workout_log_id)) {
          setsByLogId.set(row.workout_log_id, []);
        }
        setsByLogId.get(row.workout_log_id).push(row);
      }
    }

    // 3.1 Buscar feedbacks específicos por exercício (exercise_feedback_logs)
    const feedbacksByLogId = new Map();
    const resExerciseFeedbacks = await clientF.query(`
      SELECT 
        efb.id,
        efb.workout_log_id,
        wl.student_id,
        wl.started_at as session_date,
        w.name as workout_name,
        efb.exercise_id,
        e.name as exercise_name,
        e.muscle_group,
        efb.feedback_text,
        efb.created_at
      FROM exercise_feedback_logs efb
      JOIN workout_logs wl ON wl.id = efb.workout_log_id
      JOIN exercises e ON e.id = efb.exercise_id
      LEFT JOIN workouts w ON w.id = wl.workout_id
      WHERE efb.created_at >= $1 OR efb.workout_log_id = ANY($2::uuid[])
      ORDER BY efb.created_at DESC;
    `, [sinceISO, logIds]);

    for (const row of resExerciseFeedbacks.rows) {
      const fbItem = {
        id: row.id,
        workoutLogId: row.workout_log_id,
        workoutName: row.workout_name,
        sessionDate: row.session_date,
        exerciseId: row.exercise_id,
        exerciseName: row.exercise_name,
        muscleGroup: row.muscle_group,
        feedbackText: row.feedback_text,
        createdAt: row.created_at,
      };
      if (!feedbacksByLogId.has(row.workout_log_id)) {
        feedbacksByLogId.set(row.workout_log_id, []);
      }
      feedbacksByLogId.get(row.workout_log_id).push(fbItem);

      const student = studentsMap.get(row.student_id);
      if (student) {
        student.exerciseFeedbacks.push(fbItem);
      }
    }

    // Associar logs aos alunos
    for (const log of resLogs.rows) {
      const student = studentsMap.get(log.student_id);
      if (student) {
        student.workoutsLogged.push({
          logId: log.workout_log_id,
          workoutId: log.workout_id,
          workoutName: log.workout_name,
          startedAt: log.started_at,
          finishedAt: log.finished_at,
          effortRating: log.effort_rating,
          feedbackNotes: log.feedback_notes,
          readByCoach: log.read_by_coach,
          exerciseFeedbacks: feedbacksByLogId.get(log.workout_log_id) || [],
          sets: setsByLogId.get(log.workout_log_id) || [],
        });
      }
    }

    // Função auxiliar para parsear faixas de repetições (ex: "6-10", "8–12", "10-15")
    function parseRepRange(repsTarget) {
      if (!repsTarget) return null;
      const str = String(repsTarget).trim();
      const match = str.match(/(\d+)\s*[-–a]\s*(\d+)/i);
      if (match) {
        return { minRep: parseInt(match[1], 10), maxRep: parseInt(match[2], 10) };
      }
      const single = parseInt(str, 10);
      if (!isNaN(single)) {
        return { minRep: single, maxRep: single };
      }
      return null;
    }

    // 4. Buscar a prescrição atual completa (workouts, items, sets) para os alunos ativos com treinos
    const targetStudentIds = Array.from(studentsMap.values())
      .filter(s => s.workoutsLogged.length > 0 || studentFilter)
      .map(s => s.id);

    if (targetStudentIds.length > 0) {
      const routineIds = Array.from(new Set(
        targetStudentIds
          .map(id => studentsMap.get(id)?.routineId)
          .filter(Boolean)
      ));

      if (routineIds.length > 0) {
        const resPrescription = await clientF.query(`
          SELECT 
            w.id as workout_id,
            w.routine_id,
            w.name as workout_name,
            w.order_index as workout_order,
            wi.id as workout_item_id,
            wi.exercise_id,
            e.name as exercise_name,
            e.muscle_group,
            e.muscle_weights,
            wi.order_index as item_order,
            wi.coach_notes,
            wi.group_id,
            wi.group_position,
            ws.id as workout_set_id,
            ws.set_order,
            ws.type as set_type,
            ws.reps_target,
            ws.weight_target,
            ws.rest_seconds,
            ws.rpe_target,
            ws.set_method,
            ws.execution_mode,
            ws.tempo
          FROM workouts w
          JOIN workout_items wi ON wi.workout_id = w.id
          JOIN exercises e ON e.id = wi.exercise_id
          LEFT JOIN workout_sets ws ON ws.workout_item_id = wi.id
          WHERE w.routine_id = ANY($1::uuid[])
          ORDER BY w.order_index ASC, wi.order_index ASC, ws.set_order ASC;
        `, [routineIds]);

        // Mapear por rotina
        const routineStructure = new Map();
        for (const row of resPrescription.rows) {
          if (!routineStructure.has(row.routine_id)) {
            routineStructure.set(row.routine_id, { workouts: new Map() });
          }
          const r = routineStructure.get(row.routine_id);
          if (!r.workouts.has(row.workout_id)) {
            r.workouts.set(row.workout_id, {
              id: row.workout_id,
              name: row.workout_name,
              order: row.workout_order,
              items: new Map()
            });
          }
          const w = r.workouts.get(row.workout_id);
          if (!w.items.has(row.workout_item_id)) {
            w.items.set(row.workout_item_id, {
              id: row.workout_item_id,
              exerciseId: row.exercise_id,
              exerciseName: row.exercise_name,
              muscleGroup: row.muscle_group,
              muscleWeights: row.muscle_weights || {},
              order: row.item_order,
              coachNotes: row.coach_notes,
              groupId: row.group_id,
              groupPosition: row.group_position,
              sets: []
            });
          }
          const item = w.items.get(row.workout_item_id);
          if (row.workout_set_id) {
            item.sets.push({
              id: row.workout_set_id,
              order: row.set_order,
              type: row.set_type,
              repsTarget: row.reps_target,
              weightTarget: row.weight_target,
              restSeconds: row.rest_seconds,
              rpeTarget: row.rpe_target,
              setMethod: row.set_method,
              executionMode: row.execution_mode,
              tempo: row.tempo
            });
          }
        }

        // Anexar aos alunos, calcular volume ponderado e avaliar gatilho de progressão
        for (const student of studentsMap.values()) {
          if (student.routineId && routineStructure.has(student.routineId)) {
            const rawR = routineStructure.get(student.routineId);
            const weeklyWeightedVolume = {};

            const workoutsList = Array.from(rawR.workouts.values()).map(w => ({
              id: w.id,
              name: w.name,
              order: w.order,
              items: Array.from(w.items.values()).map(i => {
                const workingSetsPrescribed = i.sets.filter(s => s.type === 'working' || !s.type);
                const workingCount = workingSetsPrescribed.length;
                const mw = i.muscleWeights || {};
                for (const [mKey, weightVal] of Object.entries(mw)) {
                  const numW = parseFloat(weightVal);
                  if (!isNaN(numW) && numW > 0) {
                    weeklyWeightedVolume[mKey] = Number(((weeklyWeightedVolume[mKey] || 0) + workingCount * numW).toFixed(2));
                  }
                }

                // Avaliar progressão dupla real contra o último treino logado que contenha este exercício
                const primaryWorkingSet = workingSetsPrescribed[0] || i.sets[0];
                const range = parseRepRange(primaryWorkingSet?.repsTarget);
                let progressionEvaluation = null;

                if (range) {
                  const matchingLog = student.workoutsLogged.find(wl =>
                    wl.sets.some(s => s.exercise_id === i.exerciseId && (s.set_type === 'working' || !s.set_type))
                  );
                  if (matchingLog) {
                    const loggedWorkingSets = matchingLog.sets.filter(
                      s => s.exercise_id === i.exerciseId && (s.set_type === 'working' || !s.set_type) && s.reps_completed !== null
                    );
                    if (loggedWorkingSets.length > 0) {
                      const repsArr = loggedWorkingSets.map(s => Number(s.reps_completed));
                      const avgReps = Number((repsArr.reduce((a, b) => a + b, 0) / repsArr.length).toFixed(2));
                      const allWithinRange = repsArr.every(r => r >= range.minRep);
                      const noExcessiveRpe = loggedWorkingSets.every(s => s.rpe_actual === null || s.rpe_actual === undefined || Number(s.rpe_actual) <= 9.5);
                      const firstTwoHitCeiling =
                        repsArr.length >= 2 &&
                        repsArr[0] >= range.maxRep &&
                        repsArr[1] >= range.maxRep &&
                        allWithinRange;
                      const avgNearCeiling = avgReps >= (range.maxRep - 0.7) && allWithinRange;
                      const eligibleForProgression = (firstTwoHitCeiling || avgNearCeiling) && noExcessiveRpe;

                      let reason = 'Dentro da faixa (em consolidação)';
                      if (eligibleForProgression) {
                        reason = firstTwoHitCeiling
                          ? `Bateu o teto (${range.maxRep} reps) nas 2 primeiras séries de trabalho (${repsArr.join(', ')})`
                          : `Média das séries de trabalho (${avgReps}) muito próxima ao teto (${range.maxRep}) com todas dentro da faixa (${repsArr.join(', ')})`;
                      } else if (!allWithinRange) {
                        reason = `Repetição abaixo do piso da faixa (${range.minRep}) em pelo menos 1 série (${repsArr.join(', ')})`;
                      } else if (!noExcessiveRpe) {
                        reason = `RPE acima de 9.5 reportado (${repsArr.join(', ')}) — consolidar carga`;
                      }

                      progressionEvaluation = {
                        workoutLogId: matchingLog.logId,
                        sessionDate: matchingLog.startedAt,
                        repsTarget: primaryWorkingSet?.repsTarget,
                        minRep: range.minRep,
                        maxRep: range.maxRep,
                        loggedReps: repsArr,
                        loggedWeights: loggedWorkingSets.map(s => Number(s.weight_kg)),
                        loggedRpes: loggedWorkingSets.map(s => s.rpe_actual !== null ? Number(s.rpe_actual) : null),
                        avgReps,
                        firstTwoHitCeiling,
                        avgNearCeiling,
                        eligibleForProgression,
                        reason
                      };

                      if (eligibleForProgression) {
                        student.progressionCandidates.push({
                          workoutId: w.id,
                          workoutName: w.name,
                          workoutItemId: i.id,
                          exerciseId: i.exerciseId,
                          exerciseName: i.exerciseName,
                          currentWeightTarget: primaryWorkingSet?.weightTarget,
                          repsTarget: primaryWorkingSet?.repsTarget,
                          ...progressionEvaluation
                        });
                      }
                    }
                  }
                }

                return {
                  ...i,
                  sets: i.sets,
                  progressionEvaluation
                };
              })
            }));

            student.prescribedRoutine = {
              id: student.routineId,
              name: student.routineName,
              weeklyWeightedVolume,
              workouts: workoutsList
            };
          }
        }
      }
    }

    // 5. Consultar dados do Questionários (Anamnese, Check-ins, Alertas)
    if (clientQ) {
      const resCRMAlunos = await clientQ.query(`
        SELECT id, nome, telefone, fitcoach_student_id
        FROM aluno;
      `);
      
      const crmAlunoByFitcoachId = new Map();
      const crmAlunoByName = new Map();
      for (const a of resCRMAlunos.rows) {
        if (a.fitcoach_student_id) {
          crmAlunoByFitcoachId.set(a.fitcoach_student_id, a);
        }
        if (a.nome) {
          crmAlunoByName.set(a.nome.trim().toLowerCase(), a);
        }
      }

      // Buscar check-ins recentes (últimos 30 dias para contexto histórico)
      const resCheckins = await clientQ.query(`
        SELECT 
          rq.id,
          rq.aluno_id,
          rq.tipo,
          rq.respostas,
          rq.submetido_em,
          rq.revisado
        FROM resposta_questionario rq
        WHERE rq.submetido_em >= $1
        ORDER BY rq.submetido_em DESC;
      `, [sinceISO]);

      const checkinsByAlunoId = new Map();
      for (const c of resCheckins.rows) {
        if (!checkinsByAlunoId.has(c.aluno_id)) {
          checkinsByAlunoId.set(c.aluno_id, []);
        }
        checkinsByAlunoId.get(c.aluno_id).push(c);
      }

      // Buscar anamneses (v1 e v2)
      const resAnamneses = await clientQ.query(`
        SELECT id, aluno_id, schema_version, content, status, created_at, updated_at
        FROM anamneses
        ORDER BY created_at DESC;
      `);

      for (const student of studentsMap.values()) {
        student.crmData = buildCrmDataForStudent(
          student,
          resCRMAlunos.rows,
          resAnamneses.rows,
          checkinsByAlunoId,
        );
      }
    }

    // 6. Verificar dossiê persistente e cache do WhatsApp Web no disco local
    const sinceTimeMs = sinceDate.getTime();
    for (const student of studentsMap.values()) {
      const slug = slugifyStudentName(student.name);

      const dossierFile = join(STUDENTS_DOCS_DIR, `${slug}.md`);
      if (existsSync(dossierFile)) {
        student.existingDossierPath = dossierFile;
        student.existingDossierContent = readFileSync(dossierFile, 'utf8');
      } else {
        student.suggestedDossierPath = dossierFile;
      }

      const waCacheFile = join(WHATSAPP_CACHE_DIR, `${slug}.json`);
      const waCache = loadWhatsAppCacheFile(waCacheFile);
      if (waCache && Array.isArray(waCache.messages)) {
        const recentMessages = waCache.messages.filter((m) => {
          if (!m.timestamp) return true;
          const tMs = new Date(m.timestamp).getTime();
          return isNaN(tMs) || tMs >= sinceTimeMs;
        });
        const audioTranscriptionsCount = recentMessages.filter(
          (m) => m.type === 'audio' && m.transcription
        ).length;
        const clinicalHighlights = recentMessages.filter(
          (m) => Array.isArray(m.clinicalTags) && m.clinicalTags.some((t) => t !== 'geral')
        );

        student.whatsappHistory = {
          lastSyncAt: waCache.lastSyncAt || null,
          matchedVia: waCache.matchedVia || null,
          matchedChatTitle: waCache.matchedChatTitle || null,
          totalCachedMessages: waCache.messages.length,
          recentMessages,
          audioTranscriptionsCount,
          clinicalHighlights,
        };
      } else {
        student.whatsappHistory = {
          lastSyncAt: null,
          matchedVia: null,
          matchedChatTitle: null,
          totalCachedMessages: 0,
          recentMessages: [],
          audioTranscriptionsCount: 0,
          clinicalHighlights: [],
        };
      }
    }

    // Filtrar apenas alunos que tiveram atividade recente (ou o aluno filtrado)
    const result = Array.from(studentsMap.values()).filter(s => {
      if (studentFilter) return true;
      const hasWaActivity = (s.whatsappHistory?.recentMessages?.length || 0) > 0;
      return s.workoutsLogged.length > 0 || s.exerciseFeedbacks.length > 0 || hasWaActivity;
    });

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      daysAnalyzed: days,
      totalStudentsFound: result.length,
      students: result
    }, null, 2));

  } catch (err) {
    console.error('[ERRO FATAL na consulta]:', err);
    process.exit(1);
  } finally {
    await clientF.end();
    if (clientQ) await clientQ.end();
  }
}

export function buildCrmDataForStudent(
  student,
  crmAlunosRows = [],
  anamnesesRows = [],
  checkinsByAlunoId = new Map(),
) {
  const { crmAluno, anamnese, phone } = matchStudentAnamneseAndCrm(
    { fitcoachId: student.id, name: student.name, email: student.email },
    crmAlunosRows,
    anamnesesRows,
  );

  if (!crmAluno && !anamnese) {
    return null;
  }

  const checkins = crmAluno ? (checkinsByAlunoId.get(crmAluno.id) || []) : [];
  const ac = anamnese?.content || {};
  const normalizedAnamnese = anamnese ? normalizeAnamneseContent(ac) : null;

  return {
    alunoCrmId: crmAluno?.id || null,
    telefone: phone,
    recentCheckins: checkins.map((ch) => ({
      id: ch.id,
      tipo: ch.tipo,
      submetidoEm: ch.submetido_em,
      revisado: ch.revisado,
      adesaoCronograma: ch.respostas?.adesao_cronograma,
      confortoExecucao: ch.respostas?.adesao_conforto_execucao,
      confortoJustificativa: ch.respostas?.adesao_conforto_execucao_justificativa,
      intensidadeEsforco: ch.respostas?.intensidade_esforco,
      intensidadeJustificativa: ch.respostas?.intensidade_esforco_justificativa,
      recuperacaoSono: ch.respostas?.recuperacao_sono,
      recuperacaoSonoJustificativa: ch.respostas?.recuperacao_sono_justificativa,
      recuperacaoDoms: ch.respostas?.recuperacao_doms,
      recuperacaoDisposicao: ch.respostas?.recuperacao_disposicao,
      outrasRespostas: ch.respostas,
    })),
    anamnese: anamnese && normalizedAnamnese
      ? {
          id: anamnese.id,
          alunoId: anamnese.aluno_id || crmAluno?.id || null,
          schemaVersion: normalizedAnamnese.schemaVersion,
          isLegacy: normalizedAnamnese.isLegacy,
          criadoEm: anamnese.created_at,
          atualizadoEm: anamnese.updated_at || null,
          resumo: {
            identificacao: normalizedAnamnese.identificacao,
            objetivo: normalizedAnamnese.objetivos.objetivoPrincipal,
            detalhesObjetivo: normalizedAnamnese.objetivos.detalhes,
            prioridadeMuscular: normalizedAnamnese.objetivos.prioridadesDisplay,
            prioridadesLista: normalizedAnamnese.objetivos.prioridades,
            prazoOuEvento: normalizedAnamnese.objetivos.prazoOuEvento,
            experiencia: normalizedAnamnese.historico.nivel,
            situacaoAtual: normalizedAnamnese.historico.situacaoAtual,
            tempoFichaAtual: normalizedAnamnese.historico.tempoFichaAtual,
            ondeTravou: normalizedAnamnese.historico.ondeTravouDisplay,
            fichaAtualTexto: normalizedAnamnese.historico.fichaAtualTexto,
            cargasRecentes: normalizedAnamnese.historico.cargasRecentes,
            printsTreinoCount: normalizedAnamnese.historico.printsTreino.length,
            historicoTreino: normalizedAnamnese.historico.situacaoAtual,
            lesoesDores:
              normalizedAnamnese.saudeERecuperacao.dorOuLesao.status === 'sim'
                ? `${normalizedAnamnese.saudeERecuperacao.dorOuLesao.regioes.join(', ')}: ${normalizedAnamnese.saudeERecuperacao.dorOuLesao.movimentosQueIncomodam}`
                : normalizedAnamnese.saudeERecuperacao.dorOuLesao.status === 'nenhum'
                  ? 'Nenhum'
                  : 'Não informado',
            dorDetalhes: normalizedAnamnese.saudeERecuperacao.dorOuLesao,
            doencas: normalizedAnamnese.saudeERecuperacao.condicaoMedica.descricao,
            documentosMedicosCount: normalizedAnamnese.saudeERecuperacao.documentosMedicos.length,
            equipamentos: normalizedAnamnese.equipamentos.ambienteResumo,
            horarioLotacaoAcademia: normalizedAnamnese.equipamentos.horarioLotacaoAcademia,
            maquinasConfirmadas: normalizedAnamnese.equipamentos.maquinasConfirmadas.map((m) => m.nome),
            maquinasAusentes: normalizedAnamnese.equipamentos.maquinasAusentes.map((m) => m.nome),
            maquinasNaoSabe: normalizedAnamnese.equipamentos.maquinasNaoSabe.map((m) => m.nome),
            preferencias: normalizedAnamnese.preferenciasELogistica,
            frequencia: normalizedAnamnese.agenda.metaDiasPorSemanaDisplay,
            tempoTreino: normalizedAnamnese.agenda.duracaoPadraoDisplay,
            agendaStatus: normalizedAnamnese.agenda.statusLabel,
            musculacaoResumo: normalizedAnamnese.agenda.musculacaoResumo,
            diasFixos: normalizedAnamnese.agenda.diasFixos,
            alternancias: normalizedAnamnese.agenda.alternancias,
            outrasAtividadesStatus: normalizedAnamnese.agenda.outrasAtividadesStatus,
            outrasAtividadesResumo: normalizedAnamnese.agenda.outrasAtividadesResumo,
            outrasAtividades: normalizedAnamnese.agenda.outrasAtividades,
            sessaoMaisPesadaSemana: normalizedAnamnese.agenda.sessaoMaisPesadaSemana,
            gradeCombinada: normalizedAnamnese.agenda.gradeCombinada,
            cardio: normalizedAnamnese.cardio,
            sono: normalizedAnamnese.saudeERecuperacao.qualidadeSono,
            fatoresRecuperacao: normalizedAnamnese.saudeERecuperacao.fatoresDisplay,
            estresse: normalizedAnamnese.saudeERecuperacao.nivelEstresse,
            dieta: ac.dietRestrictions || 'Não informado',
            plano: ac.selectedPlan || 'Não informado',
            alertasRevisaoTreinador: normalizedAnamnese.saudeERecuperacao.alertasRevisaoTreinador,
            pendencias: normalizedAnamnese.pendencias,
            perguntasSugeridasPrimeiroCheckin: normalizedAnamnese.perguntasSugeridasPrimeiroCheckin,
          },
        }
      : null,
  };
}

const isMainModule =
  process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (isMainModule) {
  run();
}
