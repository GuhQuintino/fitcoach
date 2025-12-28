import React, { useEffect, useState } from 'react';
import MainLayout from '../../components/Layout/MainLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

const Feedbacks: React.FC = () => {
    const { user } = useAuth();
    const [feedbacks, setFeedbacks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 15;

    useEffect(() => {
        if (user) {
            fetchFeedbacks(true);
        }
    }, [user]);

    const fetchFeedbacks = async (isInitial = false) => {
        try {
            if (isInitial) setLoading(true);
            else setLoadingMore(true);

            // 1. Get Coach's students
            const { data: students, error: sError } = await supabase
                .from('students_data')
                .select('id')
                .eq('coach_id', user!.id);

            if (sError) throw sError;
            const studentIds = students?.map(s => s.id) || [];

            if (studentIds.length === 0) {
                setFeedbacks([]);
                setHasMore(false);
                return;
            }

            // 2. Fetch Logs for these students
            let query = supabase
                .from('workout_logs')
                .select(`
                    *,
                    read_by_coach,
                    profiles!student_id (
                        id,
                        full_name,
                        avatar_url
                    ),
                    workout:workouts (name),
                    set_logs (
                        *,
                        exercise:exercises (name)
                    )
                `)
                .in('student_id', studentIds)
                .order('created_at', { ascending: false });

            // Range for pagination
            const from = isInitial ? 0 : feedbacks.length;
            const to = from + PAGE_SIZE - 1;
            query = query.range(from, to);

            const { data, error } = await query;

            if (error) throw error;

            if (isInitial) {
                setFeedbacks(data || []);
            } else {
                setFeedbacks(prev => [...prev, ...(data || [])]);
            }

            setHasMore(data?.length === PAGE_SIZE);
        } catch (error) {
            console.error('Error fetching feedbacks:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);

    const handleMarkAsRead = async (logId: string) => {
        try {
            const { error } = await supabase
                .from('workout_logs')
                .update({ read_by_coach: true })
                .eq('id', logId);

            if (error) throw error;

            // Update local state
            setFeedbacks(prev => prev.map(f => f.id === logId ? { ...f, read_by_coach: true } : f));
        } catch (error) {
            console.error('Error marking feedback as read:', error);
        }
    };

    return (
        <MainLayout>
            <header className="px-5 py-6 flex items-center gap-4">
                <Link to="/coach/dashboard" className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 shadow-sm border border-slate-100 dark:border-slate-700">
                    <span className="material-symbols-rounded">arrow_back</span>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">Feedbacks</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Histórico de treinos dos seus alunos</p>
                </div>
            </header>

            <main className="px-5 space-y-4">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : feedbacks.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <span className="material-symbols-rounded text-4xl text-slate-300 mb-2">chat_bubble_outline</span>
                        <p className="text-slate-500 dark:text-slate-400">Nenhum treino registrado recentemente.</p>
                    </div>
                ) : (
                    <>
                        {feedbacks.map((log) => (
                            <div key={log.id} className="bg-white dark:bg-slate-800 rounded-3xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden">
                                <div className="p-5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <img
                                            src={log.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${log.profiles?.full_name}&background=random`}
                                            alt={log.profiles?.full_name}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">{log.profiles?.full_name || 'Aluno Excluído'}</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                                                {new Date(log.created_at).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <h4 className="font-bold text-sky-600 dark:text-sky-400 mb-1">{log.workout?.name || 'Treino sem nome'}</h4>
                                        {log.feedback_notes && (
                                            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 italic mb-3">
                                                "{log.feedback_notes}"
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-4 border-t border-slate-50 dark:border-slate-700/50 pt-3">
                                        <div>
                                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Esforço</span>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">{log.effort_rating || 0}/10</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Duração</span>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                {log.finished_at && log.started_at
                                                    ? `${Math.floor((new Date(log.finished_at).getTime() - new Date(log.started_at).getTime()) / 60000)} min`
                                                    : '-'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex-1 flex items-center gap-2 mt-4">
                                        <button
                                            onClick={() => setExpandedFeedback(expandedFeedback === log.id ? null : log.id)}
                                            className="flex-1 text-center py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-rounded text-base transition-transform duration-300" style={{ transform: expandedFeedback === log.id ? 'rotate(180deg)' : 'none' }}>
                                                expand_more
                                            </span>
                                            {expandedFeedback === log.id ? 'Ocultar' : 'Ver Detalhes'}
                                        </button>

                                        {!log.read_by_coach && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMarkAsRead(log.id);
                                                }}
                                                className="px-4 py-2.5 bg-primary/10 text-primary rounded-xl text-xs font-black hover:bg-primary hover:text-white transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                                            >
                                                <span className="material-symbols-rounded text-lg">check_circle</span>
                                                LIDO
                                            </button>
                                        )}
                                        <Link to={`/coach/student/${log.profiles?.id}`} className="px-4 py-2.5 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 font-bold text-xs rounded-xl hover:bg-sky-100 dark:hover:bg-sky-800 transition-colors flex items-center">
                                            Perfil
                                        </Link>
                                    </div>
                                </div>

                                {expandedFeedback === log.id && (
                                    <div className="px-5 pb-6 bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
                                        <div className="pt-4 space-y-4">
                                            {(() => {
                                                const grouped = log.set_logs.reduce((acc: any, set: any) => {
                                                    const key = set.exercise.name;
                                                    if (!acc[key]) acc[key] = [];
                                                    acc[key].push(set);
                                                    return acc;
                                                }, {});

                                                return Object.entries(grouped).map(([exerciseName, sets]: [string, any]) => (
                                                    <div key={exerciseName}>
                                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{exerciseName}</h5>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                                            {sets.map((set: any, idx: number) => (
                                                                <div key={set.id} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="w-4 h-4 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-400">{idx + 1}</span>
                                                                        <span className="font-bold text-slate-700 dark:text-slate-200">{set.weight_kg}kg <span className="text-slate-400 font-normal">x {set.reps_completed}</span></span>
                                                                    </div>
                                                                    {set.rpe_actual && (
                                                                        <span className="text-[9px] font-black text-slate-400">@{set.rpe_actual}</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {hasMore && (
                            <div className="pt-4 pb-8 flex justify-center">
                                <button
                                    onClick={() => fetchFeedbacks(false)}
                                    disabled={loadingMore}
                                    className="px-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                                >
                                    {loadingMore ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-slate-300 border-t-primary rounded-full animate-spin"></div>
                                            Carregando...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-rounded">expand_more</span>
                                            Carregar Mais
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </MainLayout >
    );
};

export default Feedbacks;
