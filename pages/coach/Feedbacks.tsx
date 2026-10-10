import React, { useEffect, useState, useCallback, useRef } from 'react';
import MainLayout from '../../components/Layout/MainLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { compareSessions, SessionComparisonResult } from '../../utils/sessionComparison';

const formatTime = (seconds: number | string | null | undefined) => {
    if (seconds === null || seconds === undefined) return '-';
    const sec = parseInt(seconds.toString(), 10);
    if (isNaN(sec)) return '-';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

type FeedbackFilter = 'unread' | 'all';

const PAGE_SIZE = 15;

const Feedbacks: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [filter, setFilter] = useState<FeedbackFilter>('unread');
    const [feedbacks, setFeedbacks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);
    const [sessionComparisons, setSessionComparisons] = useState<Record<string, SessionComparisonResult>>({});
    const [showMarkAllConfirm, setShowMarkAllConfirm] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);

    const studentIdsRef = useRef<string[]>([]);
    const lastCreatedAtRef = useRef<string | null>(null);

    // Carregar contagem de treinos não lidos
    const fetchUnreadCount = useCallback(async (studentIds: string[]) => {
        if (!studentIds || studentIds.length === 0) {
            setUnreadCount(0);
            return;
        }

        try {
            const { count, error } = await supabase
                .from('workout_logs')
                .select('id', { count: 'exact', head: true })
                .in('student_id', studentIds)
                .eq('read_by_coach', false);

            if (!error && count !== null) {
                setUnreadCount(count);
            }
        } catch (err) {
            // Silencioso para não poluir UI
        }
    }, []);

    // Buscar treinos anteriores em lote para comparar volume e melhor série
    const fetchPreviousSessionsInBatch = async (logs: any[]) => {
        const eligible = logs.filter((l) => l && l.workout_id && l.finished_at);
        if (eligible.length === 0) return;

        const studentIds = Array.from(new Set(eligible.map((l) => l.student_id)));
        const workoutIds = Array.from(new Set(eligible.map((l) => l.workout_id)));

        try {
            const { data: previousLogs, error } = await supabase
                .from('workout_logs')
                .select(`
                    id,
                    student_id,
                    workout_id,
                    finished_at,
                    set_logs (
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
                        exercise:exercises (id, name, exercise_type)
                    )
                `)
                .in('student_id', studentIds)
                .in('workout_id', workoutIds)
                .not('finished_at', 'is', null)
                .order('finished_at', { ascending: false });

            if (error || !previousLogs) return;

            const comparisons: Record<string, SessionComparisonResult> = {};

            const normalizeSetLogs = (sets: any[] | null | undefined) => {
                if (!sets || !Array.isArray(sets)) return [];
                return sets.map((s) => ({
                    ...s,
                    exercise: Array.isArray(s.exercise) ? s.exercise[0] : s.exercise,
                }));
            };

            for (const log of logs) {
                if (!log.workout_id || !log.finished_at) {
                    comparisons[log.id] = compareSessions(normalizeSetLogs(log.set_logs), null);
                    continue;
                }

                const logFinishedTime = new Date(log.finished_at).getTime();

                // Encontrar o log imediatamente anterior deste mesmo treino e aluno
                const prevLog = previousLogs.find(
                    (p) =>
                        p.student_id === log.student_id &&
                        p.workout_id === log.workout_id &&
                        new Date(p.finished_at).getTime() < logFinishedTime
                );

                comparisons[log.id] = compareSessions(
                    normalizeSetLogs(log.set_logs),
                    prevLog ? normalizeSetLogs(prevLog.set_logs) : null
                );
            }

            setSessionComparisons((prev) => ({ ...prev, ...comparisons }));
        } catch (err) {
            // Falha graciosa: cards sem comparação
        }
    };

    // Buscar lista de feedbacks (com suporte a filtro e cursor)
    const fetchFeedbacks = useCallback(
        async (isInitial = false) => {
            if (!user) return;

            try {
                if (isInitial) {
                    setLoading(true);
                    lastCreatedAtRef.current = null;
                } else {
                    setLoadingMore(true);
                }

                // 1. Obter alunos do coach
                let studentIds = studentIdsRef.current;
                if (studentIds.length === 0) {
                    const { data: students, error: sError } = await supabase
                        .from('students_data')
                        .select('id')
                        .eq('coach_id', user.id);

                    if (sError) throw sError;
                    studentIds = students?.map((s) => s.id) || [];
                    studentIdsRef.current = studentIds;
                }

                if (studentIds.length === 0) {
                    setFeedbacks([]);
                    setHasMore(false);
                    setUnreadCount(0);
                    return;
                }

                // Atualizar contador em segundo plano
                if (isInitial) {
                    fetchUnreadCount(studentIds);
                }

                // 2. Query de feedbacks
                let query = supabase
                    .from('workout_logs')
                    .select(`
                        id,
                        student_id,
                        workout_id,
                        started_at,
                        finished_at,
                        effort_rating,
                        feedback_notes,
                        read_by_coach,
                        created_at,
                        profiles!student_id (
                            id,
                            full_name,
                            avatar_url
                        ),
                        workout:workouts (id, name),
                        set_logs (
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
                            exercise:exercises (id, name, exercise_type)
                        ),
                        exercise_feedback_logs (
                            id,
                            exercise_id,
                            feedback_text,
                            sentiment,
                            created_at
                        )
                    `)
                    .in('student_id', studentIds);

                if (filter === 'unread') {
                    query = query.eq('read_by_coach', false);
                }

                // Paginação por cursor
                if (!isInitial && lastCreatedAtRef.current) {
                    query = query.lt('created_at', lastCreatedAtRef.current);
                }

                query = query.order('created_at', { ascending: false }).limit(PAGE_SIZE);

                const { data, error } = await query;

                if (error) throw error;

                const newLogs = data || [];

                if (newLogs.length > 0) {
                    lastCreatedAtRef.current = newLogs[newLogs.length - 1].created_at;
                }

                if (isInitial) {
                    setFeedbacks(newLogs);
                } else {
                    setFeedbacks((prev) => [...prev, ...newLogs]);
                }

                setHasMore(newLogs.length === PAGE_SIZE);

                // Disparar cálculo de comparação com treinos anteriores em lote
                fetchPreviousSessionsInBatch(newLogs);
            } catch (error) {
                toast.error('Erro ao carregar feedbacks.');
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [user, filter, fetchUnreadCount]
    );

    useEffect(() => {
        if (user) {
            fetchFeedbacks(true);
        }
    }, [user, filter, fetchFeedbacks]);

    // Marcar item como lido (otimista)
    const handleMarkAsRead = async (logId: string) => {
        const target = feedbacks.find((f) => f.id === logId);
        if (target?.read_by_coach) return;

        // Atualização otimista no estado local (mantém no feed com estado lido para evitar saltos)
        setFeedbacks((prev) =>
            prev.map((f) => (f.id === logId ? { ...f, read_by_coach: true } : f))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        try {
            const { error } = await supabase
                .from('workout_logs')
                .update({ read_by_coach: true })
                .eq('id', logId);

            if (error) {
                // Reverter se falhar
                setFeedbacks((prev) =>
                    prev.map((f) => (f.id === logId ? { ...f, read_by_coach: false } : f))
                );
                setUnreadCount((prev) => prev + 1);
                toast.error('Não foi possível marcar como lido.');
            }
        } catch (error) {
            setFeedbacks((prev) =>
                prev.map((f) => (f.id === logId ? { ...f, read_by_coach: false } : f))
            );
            setUnreadCount((prev) => prev + 1);
        }
    };

    // Abrir treino no editor e marcar como lido
    const handleOpenWorkout = async (log: any) => {
        if (!log.workout_id || !log.workout) {
            toast.error('Treino original não está mais disponível.');
            return;
        }

        if (!log.read_by_coach) {
            handleMarkAsRead(log.id);
        }

        navigate(`/coach/editor?workout_id=${log.workout_id}&student_id=${log.student_id}`);
    };

    // Marcar todos como lidos em lote
    const handleMarkAllAsRead = async () => {
        const studentIds = studentIdsRef.current;
        if (studentIds.length === 0 || unreadCount === 0) {
            setShowMarkAllConfirm(false);
            return;
        }

        try {
            setMarkingAll(true);

            const { error } = await supabase
                .from('workout_logs')
                .update({ read_by_coach: true })
                .in('student_id', studentIds)
                .eq('read_by_coach', false);

            if (error) throw error;

            // Atualizar estado local
            setFeedbacks((prev) => prev.map((f) => ({ ...f, read_by_coach: true })));
            setUnreadCount(0);
            setShowMarkAllConfirm(false);
            toast.success('Todos os feedbacks foram marcados como lidos.');
        } catch (err) {
            toast.error('Erro ao marcar todos como lidos.');
        } finally {
            setMarkingAll(false);
        }
    };

    return (
        <MainLayout>
            {/* Header */}
            <header className="px-5 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        to="/coach/dashboard"
                        aria-label="Voltar para a dashboard"
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 shadow-sm border border-slate-100 dark:border-slate-700 hover:text-sky-500 transition-colors"
                    >
                        <span className="material-symbols-rounded" aria-hidden="true">
                            arrow_back
                        </span>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
                                Feedbacks
                            </h1>
                            {unreadCount > 0 && (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-sky-500 text-white shadow-sm">
                                    {unreadCount} novos
                                </span>
                            )}
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            Fila de acompanhamento de treinos dos seus alunos
                        </p>
                    </div>
                </div>

                {/* Ações do cabeçalho */}
                <div className="flex items-center gap-3">
                    {/* Botão Marcar Todos Como Lidos com Confirmação Inline */}
                    {unreadCount > 0 && (
                        <div>
                            {!showMarkAllConfirm ? (
                                <button
                                    type="button"
                                    onClick={() => setShowMarkAllConfirm(true)}
                                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:border-sky-500 hover:text-sky-500 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                                >
                                    <span className="material-symbols-rounded text-base" aria-hidden="true">
                                        done_all
                                    </span>
                                    Marcar todos como lidos
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 animate-fade-in text-xs">
                                    <span className="font-bold text-slate-700 dark:text-slate-300 pl-2">
                                        Marcar {unreadCount} como lidos?
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleMarkAllAsRead}
                                        disabled={markingAll}
                                        className="min-h-[44px] bg-sky-500 text-white font-black px-4 py-2 rounded-xl hover:bg-sky-600 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center cursor-pointer active:scale-95"
                                    >
                                        {markingAll ? 'Marcando...' : 'Confirmar'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowMarkAllConfirm(false)}
                                        disabled={markingAll}
                                        className="min-h-[44px] text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 px-3 py-2 font-bold flex items-center justify-center cursor-pointer rounded-xl"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Segmented Control de Filtro (Idêntico a Dashboard.tsx:297-313) */}
                    <div
                        className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700"
                        role="tablist"
                        aria-label="Filtro de feedbacks"
                    >
                        {(['unread', 'all'] as const).map((f) => (
                            <button
                                key={f}
                                type="button"
                                role="tab"
                                aria-selected={filter === f}
                                onClick={() => setFilter(f)}
                                className={`px-4 sm:px-5 py-2 min-h-[44px] text-xs font-bold rounded-xl transition-all uppercase tracking-widest flex items-center justify-center gap-2 ${
                                    filter === f
                                        ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
                                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                <span>{f === 'unread' ? 'Não lidos' : 'Todos'}</span>
                                {f === 'unread' && unreadCount > 0 && (
                                    <span
                                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                                            filter === 'unread'
                                                ? 'bg-white text-sky-600'
                                                : 'bg-sky-500 text-white'
                                        }`}
                                    >
                                        {unreadCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Listagem */}
            <div className="px-5 space-y-4 pb-12">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3" role="status" aria-live="polite">
                        <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin"></div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            Carregando feedbacks...
                        </span>
                    </div>
                ) : feedbacks.length === 0 ? (
                    <div className="text-center py-14 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                        <span className="material-symbols-rounded text-4xl text-slate-300 dark:text-slate-600 mb-2 block" aria-hidden="true">
                            {filter === 'unread' ? 'check_circle' : 'chat_bubble_outline'}
                        </span>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                            {filter === 'unread' ? 'Nenhum feedback pendente!' : 'Nenhum treino registrado.'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                            {filter === 'unread'
                                ? 'Você está em dia com todas as revisões de treinos dos seus alunos.'
                                : 'Quando seus alunos concluírem treinos, eles aparecerão nesta lista.'}
                        </p>
                    </div>
                ) : (
                    <>
                        {feedbacks.map((log) => {
                            const isUnread = !log.read_by_coach;
                            const hasNotes = Boolean(log.feedback_notes && log.feedback_notes.trim());
                            const hasExerciseFeedbacks = Boolean(
                                log.exercise_feedback_logs && log.exercise_feedback_logs.length > 0
                            );
                            const hasWrittenFeedback = hasNotes || hasExerciseFeedbacks;
                            const totalComments =
                                (hasNotes ? 1 : 0) + (log.exercise_feedback_logs?.length || 0);

                            const comparison = sessionComparisons[log.id];
                            const isExpanded = expandedFeedback === log.id;
                            const workoutAvailable = Boolean(log.workout_id && log.workout);

                            return (
                                <div
                                    key={log.id}
                                    className={`bg-white dark:bg-slate-800 rounded-3xl shadow-sm border transition-all overflow-hidden ${
                                        !isUnread && filter === 'unread'
                                            ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700'
                                            : hasWrittenFeedback
                                            ? 'border-amber-400/80 dark:border-amber-500/50 ring-1 ring-amber-400/20 shadow-amber-500/5'
                                            : 'border-slate-200/80 dark:border-slate-700/80'
                                    }`}
                                >
                                    <div className="p-5">
                                        {/* Cabeçalho do Card */}
                                        <div className="flex items-start justify-between gap-3 mb-4">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={
                                                        log.profiles?.avatar_url ||
                                                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                                            log.profiles?.full_name || 'Aluno'
                                                        )}&background=random`
                                                    }
                                                    alt={log.profiles?.full_name || 'Avatar do Aluno'}
                                                    className="w-11 h-11 rounded-2xl object-cover border border-slate-100 dark:border-slate-700 shadow-xs"
                                                    loading="lazy"
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                                                            {log.profiles?.full_name || 'Aluno Excluído'}
                                                        </h3>
                                                        {isUnread ? (
                                                            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
                                                                Lido
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                                                        {new Date(log.created_at).toLocaleDateString('pt-BR', {
                                                            weekday: 'long',
                                                            day: 'numeric',
                                                            month: 'long',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Badges de destaque do card */}
                                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                                                {/* Destaque de feedback escrito (Regra R9) */}
                                                {hasWrittenFeedback && (
                                                    <span className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20 text-[11px] font-black flex items-center gap-1">
                                                        <span className="material-symbols-rounded text-sm" aria-hidden="true">
                                                            comment
                                                        </span>
                                                        {totalComments} {totalComments === 1 ? 'comentário' : 'comentários'}
                                                    </span>
                                                )}

                                                {/* Badge de comparação de volume (Regra R8) */}
                                                {comparison && (
                                                    <>
                                                        {comparison.isFirstTime ? (
                                                            <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 text-[11px] font-bold">
                                                                1ª vez
                                                            </span>
                                                        ) : comparison.volumeDeltaPct !== null ? (
                                                            <span
                                                                className={`px-2.5 py-1 rounded-xl text-[11px] font-black flex items-center gap-1 ${
                                                                    comparison.volumeDeltaPct > 0
                                                                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                                                                        : comparison.volumeDeltaPct < 0
                                                                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                                                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                                }`}
                                                            >
                                                                Volume{' '}
                                                                {comparison.volumeDeltaPct > 0
                                                                    ? `▲ +${comparison.volumeDeltaPct}%`
                                                                    : comparison.volumeDeltaPct < 0
                                                                    ? `▼ ${comparison.volumeDeltaPct}%`
                                                                    : '= igual'}
                                                            </span>
                                                        ) : null}
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Informações do Treino */}
                                        <div className="mb-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-sky-600 dark:text-sky-400 text-sm">
                                                    {log.workout?.name || 'Treino sem nome'}
                                                </h4>
                                                {!workoutAvailable && (
                                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                                                        Removido
                                                    </span>
                                                )}
                                            </div>

                                            {/* Observação Geral da Sessão */}
                                            {log.feedback_notes && (
                                                <div className="bg-amber-50/40 dark:bg-amber-500/10 p-3 rounded-2xl border border-amber-200/50 dark:border-amber-500/20 text-sm text-slate-700 dark:text-slate-200 italic mb-3">
                                                    "{log.feedback_notes}"
                                                </div>
                                            )}

                                            {/* Prévia de feedbacks por exercício no card fechado */}
                                            {!isExpanded && hasExerciseFeedbacks && (
                                                <div className="space-y-1.5 mt-2">
                                                    {log.exercise_feedback_logs.slice(0, 2).map((ef: any) => {
                                                        const matchingSet = log.set_logs?.find(
                                                            (s: any) => s.exercise_id === ef.exercise_id
                                                        );
                                                        const exName = matchingSet?.exercise?.name || 'Exercício';
                                                        return (
                                                            <div
                                                                key={ef.id}
                                                                className="text-xs bg-slate-50 dark:bg-slate-900/40 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-2 text-slate-600 dark:text-slate-300"
                                                            >
                                                                <span className="font-bold text-amber-600 dark:text-amber-400 shrink-0">
                                                                    {exName}:
                                                                </span>
                                                                <span className="truncate italic">"{ef.feedback_text}"</span>
                                                            </div>
                                                        );
                                                    })}
                                                    {log.exercise_feedback_logs.length > 2 && (
                                                        <span className="text-[10px] font-bold text-slate-400 pl-1">
                                                            +{log.exercise_feedback_logs.length - 2} outro comentário...
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Métricas da Sessão */}
                                        <div className="flex gap-6 border-t border-slate-100 dark:border-slate-700/60 pt-3">
                                            <div>
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">
                                                    Esforço
                                                </span>
                                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {log.effort_rating || 0}/10
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">
                                                    Duração
                                                </span>
                                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {log.finished_at && log.started_at
                                                        ? `${Math.floor(
                                                              (new Date(log.finished_at).getTime() -
                                                                  new Date(log.started_at).getTime()) /
                                                                  60000
                                                          )} min`
                                                        : '-'}
                                                </span>
                                            </div>
                                            {comparison && comparison.currentVolume > 0 && (
                                                <div>
                                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">
                                                        Volume Total
                                                    </span>
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                        {comparison.currentVolume.toLocaleString('pt-BR')} kg
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Barra de Ações (Regra R5) */}
                                        <div className="flex flex-wrap items-center gap-2 mt-4 pt-1">
                                            {/* Botão Principal: ABRIR TREINO */}
                                            <button
                                                type="button"
                                                disabled={!workoutAvailable}
                                                onClick={() => handleOpenWorkout(log)}
                                                aria-label={
                                                    workoutAvailable
                                                        ? `Abrir treino ${log.workout?.name || ''} no editor`
                                                        : 'Treino removido'
                                                }
                                                className={`min-h-[44px] flex-1 px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-sm ${
                                                    workoutAvailable
                                                        ? 'bg-sky-500 text-white hover:bg-sky-600 active:scale-[0.98]'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                                                }`}
                                            >
                                                <span className="material-symbols-rounded text-base" aria-hidden="true">
                                                    {workoutAvailable ? 'open_in_new' : 'block'}
                                                </span>
                                                {workoutAvailable ? 'Abrir Treino' : 'Treino removido'}
                                            </button>

                                            {/* Botão Ver Detalhes */}
                                            <button
                                                type="button"
                                                aria-expanded={isExpanded}
                                                aria-label={isExpanded ? 'Ocultar detalhes do treino' : 'Ver detalhes do treino'}
                                                onClick={() =>
                                                    setExpandedFeedback(isExpanded ? null : log.id)
                                                }
                                                className="min-h-[44px] px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 border border-slate-200/50 dark:border-slate-700/50"
                                            >
                                                <span
                                                    className="material-symbols-rounded text-base transition-transform duration-300"
                                                    style={{
                                                        transform: isExpanded ? 'rotate(180deg)' : 'none',
                                                    }}
                                                    aria-hidden="true"
                                                >
                                                    expand_more
                                                </span>
                                                {isExpanded ? 'Ocultar' : 'Detalhes'}
                                            </button>

                                            {/* Botão Marcar como Lido se ainda não estiver lido */}
                                            {isUnread && (
                                                <button
                                                    type="button"
                                                    aria-label="Marcar feedback como lido"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleMarkAsRead(log.id);
                                                    }}
                                                    className="min-h-[44px] px-3.5 py-2.5 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded-xl text-xs font-black hover:bg-sky-500 hover:text-white transition-all flex items-center gap-1.5 shadow-xs active:scale-95 border border-sky-200/50 dark:border-sky-800/40"
                                                >
                                                    <span className="material-symbols-rounded text-base" aria-hidden="true">
                                                        check_circle
                                                    </span>
                                                    LIDO
                                                </button>
                                            )}

                                            {/* Botão Secundário: Perfil */}
                                            <Link
                                                to={`/coach/student/${log.profiles?.id}`}
                                                aria-label={`Ver perfil de ${log.profiles?.full_name || 'Aluno'}`}
                                                className="min-h-[44px] px-3 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-sky-500 font-bold text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center border border-slate-200/40 dark:border-slate-700/40"
                                            >
                                                Perfil
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Detalhes Expandidos com Delta por Exercício (Regra R8) */}
                                    {isExpanded && (
                                        <div className="px-5 pb-6 bg-slate-50/70 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
                                            <div className="pt-4 space-y-4">
                                                {(() => {
                                                    const grouped = (log.set_logs || []).reduce(
                                                        (acc: any, set: any) => {
                                                            const key = set.exercise_id || 'unknown';
                                                            if (!acc[key]) {
                                                                acc[key] = {
                                                                    name: set.exercise?.name || 'Exercício',
                                                                    exerciseId: set.exercise_id,
                                                                    sets: [],
                                                                };
                                                            }
                                                            acc[key].sets.push(set);
                                                            return acc;
                                                        },
                                                        {}
                                                    );

                                                    return Object.values(grouped).map((group: any) => {
                                                        const delta = comparison?.exerciseDeltas?.[group.exerciseId];
                                                        const exerciseFeedback = log.exercise_feedback_logs?.find(
                                                            (f: any) => f.exercise_id === group.exerciseId
                                                        );

                                                        return (
                                                            <div
                                                                key={group.exerciseId}
                                                                className="border-b border-slate-200/60 dark:border-slate-800 pb-3 last:border-none"
                                                            >
                                                                <div className="flex items-center justify-between gap-2 mb-2">
                                                                    <h5 className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                                                        {group.name}
                                                                    </h5>

                                                                    {/* Delta de Desempenho da Melhor Série */}
                                                                    {delta && !comparison?.isFirstTime && (
                                                                        <span
                                                                            className={`text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                                                                                delta.status === 'increase'
                                                                                    ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                                                                    : delta.status === 'decrease'
                                                                                    ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                                                                                    : delta.status === 'new'
                                                                                    ? 'bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400'
                                                                                    : 'bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                                                            }`}
                                                                        >
                                                                            {delta.status === 'increase'
                                                                                ? `▲ ${delta.label}`
                                                                                : delta.status === 'decrease'
                                                                                ? `▼ ${delta.label}`
                                                                                : delta.label}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Grid de Séries */}
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                                    {group.sets.map((set: any, idx: number) => (
                                                                        <div
                                                                            key={set.id || idx}
                                                                            className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs shadow-xs"
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-400 shrink-0">
                                                                                    {idx + 1}
                                                                                </span>
                                                                                {set.exercise?.exercise_type === 'cardio' ? (
                                                                                    <span className="font-bold text-slate-700 dark:text-slate-200">
                                                                                        {set.hiit_cycles_completed ? (
                                                                                            <span className="text-slate-600 dark:text-slate-400 font-normal">
                                                                                                HIIT: {set.hiit_cycles_completed} ciclos em {formatTime(set.time_completed)}
                                                                                            </span>
                                                                                        ) : (
                                                                                            <>
                                                                                                {set.distance_completed !== null && set.distance_completed !== undefined
                                                                                                    ? `${set.distance_completed}km`
                                                                                                    : '-'}
                                                                                                <span className="text-slate-600 dark:text-slate-400 font-normal">
                                                                                                    {set.speed_actual ? ` a ${set.speed_actual}km/h` : ''}
                                                                                                    {set.time_completed ? ` em ${formatTime(set.time_completed)}` : ''}
                                                                                                </span>
                                                                                            </>
                                                                                        )}
                                                                                    </span>
                                                                                ) : set.exercise?.exercise_type === 'time' ? (
                                                                                    <span className="font-bold text-slate-700 dark:text-slate-200">
                                                                                        {formatTime(set.time_completed)}
                                                                                        {set.weight_kg ? (
                                                                                            <span className="text-slate-600 dark:text-slate-400 font-normal">
                                                                                                {' '}com {set.weight_kg}kg
                                                                                            </span>
                                                                                        ) : (
                                                                                            ''
                                                                                        )}
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="font-bold text-slate-700 dark:text-slate-200">
                                                                                        {set.weight_kg ?? '-'}kg{' '}
                                                                                        <span className="text-slate-600 dark:text-slate-400 font-normal">
                                                                                            x {set.reps_completed ?? '-'}
                                                                                        </span>
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            {set.rpe_actual && (
                                                                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">
                                                                                    @{set.rpe_actual}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* Feedback do Exercício nesta Sessão */}
                                                                {exerciseFeedback && (
                                                                    <div className="mt-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs flex items-start gap-2 text-amber-900 dark:text-amber-200">
                                                                        <span className="material-symbols-rounded text-base text-amber-500 shrink-0 mt-0.5" aria-hidden="true">
                                                                            comment
                                                                        </span>
                                                                        <div className="flex-1 min-w-0">
                                                                            <span className="font-bold text-amber-700 dark:text-amber-400 block mb-0.5 text-[11px] uppercase tracking-wide">
                                                                                Feedback da Execução:
                                                                            </span>
                                                                            <p className="text-slate-700 dark:text-slate-200 italic leading-relaxed">
                                                                                "{exerciseFeedback.feedback_text}"
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Botão Carregar Mais */}
                        {hasMore && (
                            <div className="pt-4 pb-8 flex justify-center">
                                <button
                                    type="button"
                                    onClick={() => fetchFeedbacks(false)}
                                    disabled={loadingMore}
                                    className="min-h-[44px] px-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                                >
                                    {loadingMore ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin" role="status" aria-label="Carregando mais"></div>
                                            Carregando...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-rounded" aria-hidden="true">
                                                expand_more
                                            </span>
                                            Carregar Mais
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </MainLayout>
    );
};

export default Feedbacks;
