import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface ExerciseHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    exerciseId: string;
    exerciseName: string;
    studentId: string;
}

const ExerciseHistoryModal: React.FC<ExerciseHistoryModalProps> = ({ isOpen, onClose, exerciseId, exerciseName, studentId }) => {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && exerciseId && studentId) {
            fetchHistory();
        }
    }, [isOpen, exerciseId, studentId]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('set_logs')
                .select(`
                    *,
                    workout_logs!inner (
                        finished_at,
                        student_id
                    )
                `)
                .eq('exercise_id', exerciseId)
                .eq('workout_logs.student_id', studentId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            setHistory(data || []);
        } catch (err) {
            console.error('Error fetching exercise history:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-t-[32px] sm:rounded-3xl h-[70vh] flex flex-col shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto my-3 sm:hidden"></div>

                <div className="px-6 pt-4 pb-2 border-b border-slate-50 dark:border-slate-700/50 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Histórico</h3>
                        <p className="text-[10px] font-bold text-sky-500 uppercase tracking-widest mt-0.5">{exerciseName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
                            <p className="text-xs text-slate-400 font-medium">Buscando histórico...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-12 px-6">
                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-rounded text-3xl text-slate-300">history_toggle_off</span>
                            </div>
                            <p className="text-sm text-slate-500 font-medium">Nenhum registro anterior encontrado para este exercício.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {history.map((log, idx) => (
                                <div key={log.id + idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700/50">
                                    <div className="flex items-center gap-3">
                                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase flex flex-col items-center leading-none">
                                            <span>{new Date(log.workout_logs.finished_at).getDate()}</span>
                                            <span>{new Date(log.workout_logs.finished_at).toLocaleDateString('pt-BR', { month: 'short' }).slice(0, 3)}</span>
                                        </div>
                                        <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700"></div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{log.weight_kg}kg <span className="text-slate-400 font-normal">x {log.reps_completed}</span></span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{log.set_type === 'working' ? 'Série Normal' : log.set_type === 'warmup' ? 'Aquecimento' : log.set_type === 'failure' ? 'Até a Falha' : 'Drop-set'}</span>
                                        </div>
                                    </div>
                                    {log.rpe_actual && (
                                        <div className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <span className="text-[10px] font-black text-slate-400">@{log.rpe_actual}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExerciseHistoryModal;
