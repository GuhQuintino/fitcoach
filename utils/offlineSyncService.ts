import { supabase } from '../lib/supabaseClient';

export const MAX_OFFLINE_QUEUE_ITEMS = 10;
export const MAX_SYNC_RETRIES = 3;
export const OFFLINE_QUEUE_KEY = 'fc_offline_sync_queue';

export interface OfflineSetLog {
    exercise_id: string;
    set_type: string;
    set_order: number;
    weight_kg: number;
    reps_completed: number;
    rpe_actual: number | null;
    time_completed?: number | null;
    distance_completed?: number | null;
    speed_actual?: number | null;
    hiit_cycles_completed?: number | null;
}

export interface OfflineExerciseFeedback {
    exercise_id: string;
    feedback_text: string;
}

export interface OfflineWorkoutPayload {
    workoutLog: {
        student_id: string;
        workout_id: string | null;
        started_at: string;
        finished_at: string;
        effort_rating: number | null;
        feedback_notes?: string | null;
    };
    setLogs: OfflineSetLog[];
    exerciseFeedbacks: OfflineExerciseFeedback[];
}

export interface OfflineQueueItem {
    id: string;
    type: 'workout_complete';
    payload: OfflineWorkoutPayload;
    createdAt: string;
    retryCount: number;
    lastError?: string;
}

/** Retorna todos os itens pendentes na fila de sincronização */
export function getOfflineQueue(): OfflineQueueItem[] {
    try {
        const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error('[OfflineSync] Erro ao ler fila do localStorage:', e);
        return [];
    }
}

/** Salva a fila atualizada no localStorage */
function persistOfflineQueue(queue: OfflineQueueItem[]): void {
    try {
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
        console.error('[OfflineSync] Erro ao persistir fila:', e);
    }
}

/** Retorna a quantidade de treinos aguardando sincronização */
export function getPendingSyncCount(): number {
    return getOfflineQueue().length;
}

/**
 * Salva um treino na fila offline quando não há conexão.
 * Limita a fila a MAX_OFFLINE_QUEUE_ITEMS (10).
 */
export function saveOfflineWorkout(payload: OfflineWorkoutPayload): { success: boolean; queueLength: number; error?: string } {
    try {
        const queue = getOfflineQueue();

        if (queue.length >= MAX_OFFLINE_QUEUE_ITEMS) {
            console.warn('[OfflineSync] Limite da fila atingido (10 treinos). Descartando o mais antigo.');
            queue.shift(); // Remove o mais antigo para dar lugar ao novo
        }

        const newItem: OfflineQueueItem = {
            id: 'sync_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
            type: 'workout_complete',
            payload,
            createdAt: new Date().toISOString(),
            retryCount: 0
        };

        queue.push(newItem);
        persistOfflineQueue(queue);

        return {
            success: true,
            queueLength: queue.length
        };
    } catch (e: any) {
        console.error('[OfflineSync] Falha crítica ao salvar offline:', e);
        return {
            success: false,
            queueLength: 0,
            error: e.message || 'Erro ao persistir treino offline'
        };
    }
}

let isSyncing = false;

/**
 * Envia todos os treinos pendentes na fila para o Supabase.
 * Executado em ordem cronológica (FIFO).
 */
export async function flushOfflineQueue(): Promise<{ syncedCount: number; failedCount: number; errors: string[] }> {
    if (isSyncing) {
        return { syncedCount: 0, failedCount: 0, errors: ['Sincronização já em andamento'] };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return { syncedCount: 0, failedCount: 0, errors: ['Dispositivo ainda offline'] };
    }

    const queue = getOfflineQueue();
    if (queue.length === 0) {
        return { syncedCount: 0, failedCount: 0, errors: [] };
    }

    isSyncing = true;
    let syncedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const remainingQueue: OfflineQueueItem[] = [];

    for (const item of queue) {
        let insertedLogId: string | null = null;
        try {
            const { workoutLog, setLogs, exerciseFeedbacks } = item.payload;

            // 1. Deduplicação / Idempotência: Checar se já existe um log idêntico no Supabase
            let logId: string | null = null;

            let query = (supabase.from('workout_logs') as any)
                .select('id')
                .eq('student_id', workoutLog.student_id)
                .eq('started_at', workoutLog.started_at);

            if (workoutLog.workout_id) {
                query = query.eq('workout_id', workoutLog.workout_id);
            } else {
                query = query.is('workout_id', null);
            }

            const { data: existingLogs, error: checkError } = await query.limit(1);

            if (!checkError && existingLogs && existingLogs.length > 0) {
                logId = existingLogs[0].id;
                console.log(`[OfflineSync] Treino já registrado previamente (${logId}). Reutilizando cabeçalho.`);
            } else {
                // Inserir novo cabeçalho do log
                const { data: logData, error: logError } = await (supabase
                    .from('workout_logs') as any)
                    .insert({
                        student_id: workoutLog.student_id,
                        workout_id: workoutLog.workout_id,
                        started_at: workoutLog.started_at,
                        finished_at: workoutLog.finished_at,
                        effort_rating: workoutLog.effort_rating,
                        feedback_notes: workoutLog.feedback_notes || null
                    })
                    .select()
                    .single();

                if (logError || !logData) throw logError || new Error('Falha ao obter ID do log de treino');
                logId = logData.id;
                insertedLogId = logData.id;
            }

            // 2. Inserir set_logs vinculados
            if (setLogs && setLogs.length > 0 && logId) {
                // Verificar se este log já possui sets inseridos para não duplicar séries em retentativas
                const { count: existingSetsCount, error: countError } = await (supabase
                    .from('set_logs') as any)
                    .select('id', { count: 'exact', head: true })
                    .eq('workout_log_id', logId);

                if (!countError && (!existingSetsCount || existingSetsCount === 0)) {
                    const setsToInsert = setLogs.map(s => ({
                        workout_log_id: logId,
                        exercise_id: s.exercise_id,
                        set_type: s.set_type,
                        set_order: s.set_order,
                        weight_kg: s.weight_kg,
                        reps_completed: s.reps_completed,
                        rpe_actual: s.rpe_actual,
                        time_completed: s.time_completed ?? null,
                        distance_completed: s.distance_completed ?? null,
                        speed_actual: s.speed_actual ?? null,
                        hiit_cycles_completed: s.hiit_cycles_completed ?? null
                    }));

                    const { error: setsError } = await (supabase
                        .from('set_logs') as any)
                        .insert(setsToInsert);

                    if (setsError) throw setsError;
                }
            }

            // 3. Inserir feedbacks de exercício (se houver)
            if (exerciseFeedbacks && exerciseFeedbacks.length > 0 && logId) {
                const { count: existingFeedbacksCount, error: fbCountErr } = await (supabase
                    .from('exercise_feedback_logs') as any)
                    .select('id', { count: 'exact', head: true })
                    .eq('workout_log_id', logId);

                if (!fbCountErr && (!existingFeedbacksCount || existingFeedbacksCount === 0)) {
                    const feedbacksToInsert = exerciseFeedbacks.map(f => ({
                        workout_log_id: logId,
                        exercise_id: f.exercise_id,
                        feedback_text: f.feedback_text
                    }));

                    const { error: feedbackError } = await (supabase
                        .from('exercise_feedback_logs') as any)
                        .insert(feedbacksToInsert);

                    if (feedbackError) throw feedbackError;
                }
            }

            syncedCount++;
        } catch (err: any) {
            console.error(`[OfflineSync] Erro ao sincronizar item ${item.id}:`, err);

            // Rollback: se inserimos um novo cabeçalho nesta execução e o processo falhou em seguida,
            // deletamos o cabeçalho recém-criado para não deixar registros órfãos sem séries no Supabase.
            if (insertedLogId) {
                try {
                    await (supabase.from('workout_logs') as any).delete().eq('id', insertedLogId);
                    console.log(`[OfflineSync] Rollback efetuado para workout_log ${insertedLogId}`);
                } catch (cleanupErr) {
                    console.error('[OfflineSync] Falha no rollback do workout_log órfão:', cleanupErr);
                }
            }

            failedCount++;
            errors.push(err.message || 'Erro de rede ou Supabase');
            item.retryCount = (item.retryCount || 0) + 1;
            item.lastError = err.message || 'Erro desconhecido';

            // Limite de retentativas: descarta itens que falharem mais que MAX_SYNC_RETRIES para evitar loop eterno
            if (item.retryCount < MAX_SYNC_RETRIES) {
                remainingQueue.push(item);
            } else {
                console.warn(`[OfflineSync] Item ${item.id} atingiu o limite de ${MAX_SYNC_RETRIES} tentativas e foi descartado da fila.`);
            }
        }
    }

    persistOfflineQueue(remainingQueue);
    isSyncing = false;

    return { syncedCount, failedCount, errors };
}

/** Limpa toda a fila offline */
export function clearOfflineQueue(): void {
    try {
        localStorage.removeItem(OFFLINE_QUEUE_KEY);
    } catch (e) {
        console.error('[OfflineSync] Erro ao limpar fila:', e);
    }
}
