import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { groupExerciseSessions, GroupedExerciseSession } from '../../utils/workoutHistoryGrouper';

const formatTime = (seconds: number | string | null | undefined) => {
    if (seconds === null || seconds === undefined) return '-';
    const sec = parseInt(seconds.toString(), 10);
    if (isNaN(sec)) return '-';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

interface ExerciseHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    exerciseId: string;
    exerciseName: string;
    studentId: string;
}

const ExerciseHistoryModal: React.FC<ExerciseHistoryModalProps> = ({
    isOpen,
    onClose,
    exerciseId,
    exerciseName,
    studentId,
}) => {
    const [sessions, setSessions] = useState<GroupedExerciseSession[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        let isMounted = true;

        if (isOpen && exerciseId && studentId) {
            fetchFullHistory(isMounted);
        }

        return () => {
            isMounted = false;
        };
    }, [isOpen, exerciseId, studentId]);

    const fetchFullHistory = async (isMounted: boolean) => {
        try {
            setLoading(true);

            let allLogs: any[] = [];
            let from = 0;
            const BATCH_SIZE = 1000;
            let hasMore = true;

            // Busca paginada contornando o limite max-rows do PostgREST sem cortes artificiais
            while (hasMore) {
                const { data, error } = await supabase
                    .from('workout_logs')
                    .select(`
                        id,
                        finished_at,
                        workout:workouts (name),
                        set_logs!inner (
                            id,
                            exercise_id,
                            weight_kg,
                            reps_completed,
                            rpe_actual,
                            set_type,
                            time_completed,
                            distance_completed,
                            speed_actual,
                            hiit_cycles_completed,
                            completed_at,
                            exercise:exercises (
                                exercise_type
                            )
                        ),
                        exercise_feedback_logs (
                            exercise_id,
                            feedback_text
                        )
                    `)
                    .eq('student_id', studentId)
                    .eq('set_logs.exercise_id', exerciseId)
                    .eq('exercise_feedback_logs.exercise_id', exerciseId)
                    .order('finished_at', { ascending: false })
                    .range(from, from + BATCH_SIZE - 1);

                if (error) throw error;

                if (data && data.length > 0) {
                    allLogs = [...allLogs, ...data];
                    from += data.length;
                    hasMore = data.length === BATCH_SIZE;
                } else {
                    hasMore = false;
                }
            }

            if (!isMounted) return;

            const grouped = groupExerciseSessions(allLogs, exerciseId);
            setSessions(grouped);
        } catch (err) {
            if (isMounted) {
                setSessions([]);
            }
        } finally {
            if (isMounted) {
                setLoading(false);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`Histórico de execuções de ${exerciseName}`}
            className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl max-h-[85vh] flex flex-col shadow-2xl animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 pt-5 pb-3 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                                Histórico
                            </h3>
                            {!loading && sessions.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400">
                                    {sessions.length} {sessions.length === 1 ? 'sessão' : 'sessões'}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-widest mt-0.5 truncate max-w-[280px] sm:max-w-sm">
                            {exerciseName}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar histórico"
                        className="min-w-[44px] min-h-[44px] p-2 -mr-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
                    >
                        <span className="material-symbols-rounded" aria-hidden="true">
                            close
                        </span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                    {loading ? (
                        <div
                            className="flex flex-col items-center justify-center py-16 gap-3"
                            role="status"
                            aria-live="polite"
                        >
                            <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin"></div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                Carregando histórico completo...
                            </p>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="text-center py-14 px-6">
                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span
                                    className="material-symbols-rounded text-3xl text-slate-400"
                                    aria-hidden="true"
                                >
                                    history_toggle_off
                                </span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                Nenhum registro anterior encontrado para este exercício.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sessions.map((session) => {
                                const sessionDate = session.finishedAt
                                    ? new Date(session.finishedAt)
                                    : null;

                                return (
                                    <div
                                        key={session.sessionId}
                                        className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 overflow-hidden shadow-sm"
                                    >
                                        {/* Session Header */}
                                        <div className="px-4 py-3 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-sky-500/10 dark:bg-sky-500/20 flex items-center justify-center shrink-0">
                                                    <span className="text-xs font-black text-sky-600 dark:text-sky-400">
                                                        {sessionDate ? sessionDate.getDate() : '-'}
                                                    </span>
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 capitalize block truncate">
                                                        {sessionDate
                                                            ? sessionDate.toLocaleDateString('pt-BR', {
                                                                  weekday: 'long',
                                                                  day: 'numeric',
                                                                  month: 'short',
                                                              })
                                                            : 'Data não informada'}
                                                    </span>
                                                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block truncate">
                                                        {session.workoutName}
                                                    </span>
                                                </div>
                                            </div>

                                            {sessionDate && (
                                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                                                    {sessionDate.toLocaleTimeString('pt-BR', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                            )}
                                        </div>

                                        {/* Sets List */}
                                        <div className="p-3 space-y-2">
                                            {session.sets.map((set, idx) => (
                                                <div
                                                    key={set.id}
                                                    className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shadow-xs"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                                                            {idx + 1}
                                                        </span>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                                                                {set.exercise_type === 'cardio' ? (
                                                                    set.hiit_cycles_completed ? (
                                                                        <span className="text-slate-500 dark:text-slate-400 font-normal">
                                                                            HIIT: {set.hiit_cycles_completed} ciclos em {formatTime(set.time_completed)}
                                                                        </span>
                                                                    ) : (
                                                                        <>
                                                                            {set.distance_completed !== null && set.distance_completed !== undefined
                                                                                ? `${set.distance_completed}km`
                                                                                : '-'}
                                                                            <span className="text-slate-500 dark:text-slate-400 font-normal">
                                                                                {set.speed_actual ? ` a ${set.speed_actual}km/h` : ''}
                                                                                {set.time_completed ? ` em ${formatTime(set.time_completed)}` : ''}
                                                                            </span>
                                                                        </>
                                                                    )
                                                                ) : set.exercise_type === 'time' ? (
                                                                    <>
                                                                        {formatTime(set.time_completed)}
                                                                        {set.weight_kg ? (
                                                                            <span className="text-slate-500 dark:text-slate-400 font-normal">
                                                                                {' '}com {set.weight_kg}kg
                                                                            </span>
                                                                        ) : (
                                                                            ''
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        {set.weight_kg !== null && set.weight_kg !== undefined
                                                                            ? `${set.weight_kg}kg`
                                                                            : '-'}{' '}
                                                                        <span className="text-slate-500 dark:text-slate-400 font-normal">
                                                                            x {set.reps_completed ?? '-'}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                                                                {(() => {
                                                                    switch (set.set_type) {
                                                                        case 'working':
                                                                            return 'Série Normal';
                                                                        case 'warmup':
                                                                            return 'Aquecimento';
                                                                        case 'failure':
                                                                            return 'Até a Falha';
                                                                        case 'drop':
                                                                        case 'dropset':
                                                                            return 'Drop-set';
                                                                        case 'preparation':
                                                                            return 'Preparatória';
                                                                        case 'feeder':
                                                                            return 'Feeder';
                                                                        default:
                                                                            return 'Série Normal';
                                                                    }
                                                                })()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {set.rpe_actual && (
                                                        <div className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-700/50">
                                                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">
                                                                @{set.rpe_actual}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Exercise Specific Feedback Footer */}
                                        {session.exerciseFeedback && (
                                            <div className="p-3 pt-0">
                                                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-start gap-2 text-amber-800 dark:text-amber-200">
                                                    <span
                                                        className="material-symbols-rounded text-base text-amber-500 shrink-0 mt-0.5"
                                                        aria-hidden="true"
                                                    >
                                                        comment
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="font-bold text-amber-700 dark:text-amber-300 block mb-0.5 text-[11px] uppercase tracking-wide">
                                                            Feedback do Exercício:
                                                        </span>
                                                        <p className="italic text-slate-700 dark:text-slate-200 text-xs leading-relaxed">
                                                            "{session.exerciseFeedback}"
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExerciseHistoryModal;
