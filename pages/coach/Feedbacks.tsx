import React, { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

const Feedbacks: React.FC = () => {
    const { user } = useAuth();
    const [feedbacks, setFeedbacks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchFeedbacks();
        }
    }, [user]);

    const fetchFeedbacks = async () => {
        try {
            setLoading(true);
            // Fetch workout logs for students of this coach
            // We rely on RLS to filter logs visible to the coach
            const { data, error } = await supabase
                .from('workout_logs')
                .select(`
                    *,
                    students:student_id (
                        id,
                        full_name,
                        avatar_url
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(50); // Limit to last 50 feedbacks

            if (error) throw error;
            setFeedbacks(data || []);
        } catch (error) {
            console.error('Error fetching feedbacks:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <MainLayout className="pb-24">
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
                    feedbacks.map((log) => (
                        <div key={log.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-3 mb-4">
                                <img
                                    src={log.students?.avatar_url || `https://ui-avatars.com/api/?name=${log.students?.full_name}&background=random`}
                                    alt={log.students?.full_name}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{log.students?.full_name || 'Aluno Excluído'}</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                                        {new Date(log.created_at).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>

                            <div className="mb-4">
                                <h4 className="font-bold text-primary mb-1">{log.workout_name || 'Treino sem nome'}</h4>
                                {log.notes && (
                                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 italic">
                                        "{log.notes}"
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4 border-t border-slate-100 dark:border-slate-700 pt-3">
                                {log.rpe_avg && (
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">RPE Médio</span>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{log.rpe_avg}</span>
                                    </div>
                                )}
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Duração</span>
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                                        {log.duration_minutes ? `${log.duration_minutes} min` : '-'}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-3">
                                <Link to={`/coach/student/${log.students?.id}`} className="block w-full text-center py-2 bg-slate-50 dark:bg-slate-900 text-primary font-bold text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    Ver Perfil do Aluno
                                </Link>
                            </div>
                        </div>
                    ))
                )}
            </main>
        </MainLayout>
    );
};

export default Feedbacks;
