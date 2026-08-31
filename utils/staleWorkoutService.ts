import { supabase } from '../lib/supabaseClient';
import { saveOfflineWorkout, OfflineWorkoutPayload } from './offlineSyncService';

// ─── Constantes configuráveis ───────────────────────────────────────
export const AUTO_FINALIZE_THRESHOLD = 0.6;   // 60% das séries completadas
export const STALE_TIMEOUT_HOURS = 4;          // Horas sem interação para considerar abandonado
export const MIN_SETS_ABSOLUTE = 3;            // Mínimo absoluto de séries completadas

// ─── Tipos ──────────────────────────────────────────────────────────
interface SavedSet {
    type: string;
    weight: string;
    reps: string;
    rpe: string;
    completed: boolean;
    completed_at?: string;
    time_completed?: string;
    distance_completed?: string;
    speed_actual?: string;
    hiit_cycles_completed?: string;
}

interface SavedExercise {
    id: string;           // exercise_id
    workout_item_id: string;
    name: string;
    feedback?: string;
    sets: SavedSet[];
}

export interface SavedWorkout {
    workoutId: string;
    exercises: SavedExercise[];
    startTime: string;
    workoutSeconds: number;
    isWorkoutPaused: boolean;
    lastUpdate: string;
}

export interface AutoFinalizeResult {
    success: boolean;
    workoutName?: string;
    completedSets: number;
    totalSets: number;
    savedOffline?: boolean;
    error?: string;
}

// ─── Funções utilitárias ────────────────────────────────────────────

/** Calcula estatísticas de completude do treino salvo */
export function getCompletionStats(saved: SavedWorkout) {
    let totalSets = 0;
    let completedSets = 0;

    saved.exercises.forEach(ex => {
        ex.sets.forEach(set => {
            totalSets++;
            if (set.completed) completedSets++;
        });
    });

    const completionPercentage = totalSets > 0 ? completedSets / totalSets : 0;

    return { totalSets, completedSets, completionPercentage };
}

/** Verifica se o treino está "stale" (abandonado) e elegível para auto-finalização */
export function isWorkoutStale(saved: SavedWorkout): boolean {
    // 1. Checar timeout
    const lastUpdate = new Date(saved.lastUpdate).getTime();
    if (isNaN(lastUpdate)) return false;

    const hoursSinceUpdate = (Date.now() - lastUpdate) / (1000 * 60 * 60);
    if (hoursSinceUpdate < STALE_TIMEOUT_HOURS) return false;

    // 2. Checar threshold de séries
    const { completedSets, completionPercentage } = getCompletionStats(saved);

    if (completedSets < MIN_SETS_ABSOLUTE) return false;
    if (completionPercentage < AUTO_FINALIZE_THRESHOLD) return false;

    return true;
}

/** Auto-finaliza o treino abandonado salvando no Supabase */
export async function autoFinalizeWorkout(
    saved: SavedWorkout,
    userId: string
): Promise<AutoFinalizeResult> {
    const { completedSets, totalSets } = getCompletionStats(saved);

    try {
        // Calcular started_at/finished_at a partir dos timestamps completed_at
        const completedTimestamps: number[] = [];
        saved.exercises.forEach(ex => {
            ex.sets.forEach(set => {
                if (set.completed && set.completed_at) {
                    const ts = new Date(set.completed_at).getTime();
                    if (!isNaN(ts)) completedTimestamps.push(ts);
                }
            });
        });

        let realStartedAt: Date;
        let realFinishedAt: Date;

        if (completedTimestamps.length > 0) {
            const minTs = Math.min(...completedTimestamps);
            const maxTs = Math.max(...completedTimestamps);

            if (maxTs - minTs < 10000) {
                realStartedAt = new Date(maxTs - 60000);
                realFinishedAt = new Date(maxTs);
            } else {
                realStartedAt = new Date(minTs);
                realFinishedAt = new Date(maxTs);
            }
        } else {
            // Fallback: usar startTime e lastUpdate
            realStartedAt = new Date(saved.startTime);
            realFinishedAt = new Date(saved.lastUpdate);
        }

        // 1. Inserir workout_log (effort_rating null = auto-finalizado)
        const { data: logData, error: logError } = await supabase
            .from('workout_logs')
            .insert({
                student_id: userId,
                workout_id: saved.workoutId,
                started_at: realStartedAt.toISOString(),
                finished_at: realFinishedAt.toISOString(),
                effort_rating: null,
                feedback_notes: '⚡ Treino salvo automaticamente'
            })
            .select()
            .single();

        if (logError) throw logError;

        // 2. Inserir set_logs para séries completadas
        const setsToInsert: any[] = [];
        saved.exercises.forEach(ex => {
            ex.sets.forEach((set, i) => {
                if (set.completed) {
                    setsToInsert.push({
                        workout_log_id: logData.id,
                        exercise_id: ex.id,
                        set_type: set.type,
                        set_order: i,
                        weight_kg: parseFloat(set.weight) || 0,
                        reps_completed: parseInt(set.reps) || 0,
                        rpe_actual: parseInt(set.rpe) || null,
                        time_completed: parseInt(set.time_completed || '') || null,
                        distance_completed: parseFloat(set.distance_completed || '') || null,
                        speed_actual: parseFloat(set.speed_actual || '') || null,
                        hiit_cycles_completed: parseInt(set.hiit_cycles_completed || '') || null
                    });
                }
            });
        });

        if (setsToInsert.length > 0) {
            const { error: setsError } = await supabase
                .from('set_logs')
                .insert(setsToInsert);
            if (setsError) throw setsError;
        }

        // 3. Inserir feedbacks de exercícios (se houver)
        const feedbacksToInsert = saved.exercises
            .filter(ex => ex.feedback && ex.feedback.trim() !== '')
            .map(ex => ({
                workout_log_id: logData.id,
                exercise_id: ex.id,
                feedback_text: ex.feedback!.trim()
            }));

        if (feedbacksToInsert.length > 0) {
            const { error: feedbackError } = await supabase
                .from('exercise_feedback_logs')
                .insert(feedbacksToInsert);
            if (feedbackError) throw feedbackError;
        }

        // 4. Limpar localStorage
        localStorage.removeItem('active_workout');

        return { success: true, completedSets, totalSets };
    } catch (error: any) {
        console.error('[AutoFinalize] Falha ao enviar para Supabase. Tentando salvar na fila offline:', error);

        // Fallback: Se for erro de rede ou dispositivo offline, salva na fila local
        try {
            const completedTimestamps: number[] = [];
            saved.exercises.forEach(ex => {
                ex.sets.forEach(set => {
                    if (set.completed && set.completed_at) {
                        const ts = new Date(set.completed_at).getTime();
                        if (!isNaN(ts)) completedTimestamps.push(ts);
                    }
                });
            });

            let realStartedAt = new Date(saved.startTime);
            let realFinishedAt = new Date(saved.lastUpdate);

            if (completedTimestamps.length > 0) {
                const minTs = Math.min(...completedTimestamps);
                const maxTs = Math.max(...completedTimestamps);
                if (maxTs - minTs < 10000) {
                    realStartedAt = new Date(maxTs - 60000);
                    realFinishedAt = new Date(maxTs);
                } else {
                    realStartedAt = new Date(minTs);
                    realFinishedAt = new Date(maxTs);
                }
            }

            const setsToQueue: any[] = [];
            saved.exercises.forEach(ex => {
                ex.sets.forEach((set, i) => {
                    if (set.completed) {
                        setsToQueue.push({
                            exercise_id: ex.id,
                            set_type: set.type,
                            set_order: i,
                            weight_kg: parseFloat(set.weight) || 0,
                            reps_completed: parseInt(set.reps) || 0,
                            rpe_actual: parseInt(set.rpe) || null,
                            time_completed: parseInt(set.time_completed || '') || null,
                            distance_completed: parseFloat(set.distance_completed || '') || null,
                            speed_actual: parseFloat(set.speed_actual || '') || null,
                            hiit_cycles_completed: parseInt(set.hiit_cycles_completed || '') || null
                        });
                    }
                });
            });

            const feedbacksToQueue = saved.exercises
                .filter(ex => ex.feedback && ex.feedback.trim() !== '')
                .map(ex => ({
                    exercise_id: ex.id,
                    feedback_text: ex.feedback!.trim()
                }));

            const offlinePayload: OfflineWorkoutPayload = {
                workoutLog: {
                    student_id: userId,
                    workout_id: saved.workoutId,
                    started_at: realStartedAt.toISOString(),
                    finished_at: realFinishedAt.toISOString(),
                    effort_rating: null,
                    feedback_notes: '⚡ Treino salvo automaticamente (Offline)'
                },
                setLogs: setsToQueue,
                exerciseFeedbacks: feedbacksToQueue
            };

            const offlineRes = saveOfflineWorkout(offlinePayload);
            if (offlineRes.success) {
                localStorage.removeItem('active_workout');
                return {
                    success: true,
                    completedSets,
                    totalSets,
                    savedOffline: true
                };
            }
        } catch (offlineErr) {
            console.error('[AutoFinalize] Falha crítica no fallback offline:', offlineErr);
        }

        return {
            success: false,
            completedSets,
            totalSets,
            error: error.message || 'Erro desconhecido'
        };
    }
}
