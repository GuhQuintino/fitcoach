export interface RawSetLog {
    id: string;
    exercise_id: string;
    set_order?: number | null;
    weight_kg?: number | null;
    reps_completed?: number | null;
    rpe_actual?: number | null;
    set_type?: string | null;
    time_completed?: number | null;
    distance_completed?: number | null;
    speed_actual?: number | null;
    hiit_cycles_completed?: number | null;
    completed_at?: string | null;
    group_round?: number | null;
    set_method?: string | null;
    micro_set_index?: number | null;
    execution_mode?: string | null;
    tempo_used?: string | null;
    timer_mode?: string | null;
    exercise?: {
        exercise_type?: string | null;
    } | null;
}

export interface RawWorkoutLogWithSets {
    id: string;
    started_at?: string | null;
    finished_at: string;
    workout?: { name: string } | null;
    set_logs?: RawSetLog[];
    exercise_feedback_logs?: Array<{
        exercise_id: string;
        feedback_text: string;
    }>;
}

export interface ExerciseSessionSet {
    id: string;
    exercise_id: string;
    set_order?: number | null;
    weight_kg: number | null;
    reps_completed: number | null;
    rpe_actual: number | null;
    set_type: string | null;
    time_completed: number | null;
    distance_completed: number | null;
    speed_actual: number | null;
    hiit_cycles_completed: number | null;
    completed_at?: string | null;
    exercise_type?: string | null;
    group_round?: number | null;
    set_method?: string | null;
    micro_set_index?: number | null;
    execution_mode?: string | null;
    tempo_used?: string | null;
    timer_mode?: string | null;
}

export interface GroupedExerciseSession {
    sessionId: string;
    startedAt?: string | null;
    finishedAt: string;
    hasPerExerciseTime?: boolean;
    workoutName: string;
    sets: ExerciseSessionSet[];
    exerciseFeedback?: string | null;
}

/**
 * Agrupa os logs brutos da consulta por sessão única (workout_logs.id),
 * preservando sessões múltiplas no mesmo dia e associando o feedback técnico
 * específico do exercício.
 */
export function groupExerciseSessions(
    rawLogs: RawWorkoutLogWithSets[],
    targetExerciseId: string
): GroupedExerciseSession[] {
    if (!Array.isArray(rawLogs) || rawLogs.length === 0) {
        return [];
    }

    const sessions: GroupedExerciseSession[] = [];

    for (const log of rawLogs) {
        if (!log || !log.id) continue;

        const matchingSets = (log.set_logs || []).filter(
            (s) => s && s.exercise_id === targetExerciseId
        );

        if (matchingSets.length === 0) continue;

        // Ordenar séries por set_order -> micro_set_index -> completed_at
        const sortedSets = [...matchingSets].sort((a, b) => {
            if (typeof a.set_order === 'number' && typeof b.set_order === 'number' && a.set_order !== b.set_order) {
                return a.set_order - b.set_order;
            }
            const aHasMicro = typeof a.micro_set_index === 'number';
            const bHasMicro = typeof b.micro_set_index === 'number';
            if (aHasMicro && bHasMicro && a.micro_set_index !== b.micro_set_index) {
                return (a.micro_set_index as number) - (b.micro_set_index as number);
            }
            if (
                aHasMicro !== bHasMicro &&
                typeof a.set_order === 'number' &&
                typeof b.set_order === 'number' &&
                a.set_order === b.set_order
            ) {
                return aHasMicro ? 1 : -1;
            }
            if (a.completed_at && b.completed_at) {
                const timeA = new Date(a.completed_at).getTime();
                const timeB = new Date(b.completed_at).getTime();
                if (!Number.isNaN(timeA) && !Number.isNaN(timeB) && timeA !== timeB) {
                    return timeA - timeB;
                }
            }
            return 0;
        });

        const mappedSets: ExerciseSessionSet[] = sortedSets.map((s) => ({
            id: s.id,
            exercise_id: s.exercise_id,
            set_order: s.set_order ?? null,
            weight_kg: s.weight_kg ?? null,
            reps_completed: s.reps_completed ?? null,
            rpe_actual: s.rpe_actual ?? null,
            set_type: s.set_type ?? 'working',
            time_completed: s.time_completed ?? null,
            distance_completed: s.distance_completed ?? null,
            speed_actual: s.speed_actual ?? null,
            hiit_cycles_completed: s.hiit_cycles_completed ?? null,
            completed_at: s.completed_at ?? null,
            exercise_type: s.exercise?.exercise_type ?? 'weight',
            group_round: s.group_round ?? null,
            set_method: s.set_method ?? null,
            micro_set_index: s.micro_set_index ?? null,
            execution_mode: s.execution_mode ?? null,
            tempo_used: s.tempo_used ?? null,
            timer_mode: s.timer_mode ?? null,
        }));

        // Calcular horário real de execução daquele exercício na sessão
        const logFinishedMs = log.finished_at ? new Date(log.finished_at).getTime() : Number.NaN;
        const hasValidLogFinishedAt = !Number.isNaN(logFinishedMs);

        const realSetCompletedAt =
            sortedSets.find((s) => {
                if (!s.completed_at) return false;
                const setTs = new Date(s.completed_at).getTime();
                if (Number.isNaN(setTs)) return false;
                if (hasValidLogFinishedAt && setTs > logFinishedMs + 1000) {
                    return false;
                }
                return true;
            })?.completed_at ?? null;

        const hasPerExerciseTime = Boolean(realSetCompletedAt);
        const sessionFinishedAt = realSetCompletedAt ?? log.finished_at;

        // Buscar feedback específico deste exercício na sessão
        const exerciseFeedback =
            log.exercise_feedback_logs?.find((f) => f && f.exercise_id === targetExerciseId)
                ?.feedback_text || null;

        sessions.push({
            sessionId: log.id,
            startedAt: log.started_at ?? null,
            finishedAt: sessionFinishedAt,
            hasPerExerciseTime,
            workoutName: log.workout?.name || 'Treino',
            sets: mappedSets,
            exerciseFeedback,
        });
    }

    // Ordenar sessões da mais recente para a mais antiga
    sessions.sort((a, b) => {
        const timeA = a.finishedAt ? new Date(a.finishedAt).getTime() : 0;
        const timeB = b.finishedAt ? new Date(b.finishedAt).getTime() : 0;
        return timeB - timeA;
    });

    return sessions;
}
