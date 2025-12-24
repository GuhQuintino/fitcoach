import React, { useEffect, useState } from 'react';
import MainLayout from '../../components/Layout/MainLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Selection: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [routine, setRoutine] = useState<any>(null);
    const [workouts, setWorkouts] = useState<any[]>([]);
    const [activeWorkout, setActiveWorkout] = useState<any>(null);

    useEffect(() => {
        if (user) {
            fetchRoutineAndWorkouts();
            const saved = localStorage.getItem('active_workout');
            if (saved) {
                try {
                    setActiveWorkout(JSON.parse(saved));
                } catch (e) {
                    console.error("Error parsing saved workout", e);
                }
            }
        }
    }, [user]);

    const handleDiscardWorkout = () => {
        if (confirm('Deseja realmente descartar o progresso do treino atual?')) {
            localStorage.removeItem('active_workout');
            setActiveWorkout(null);
        }
    };

    const [suggestedIndex, setSuggestedIndex] = useState(0);

    const fetchRoutineAndWorkouts = async () => {
        try {
            setLoading(true);
            const { data: assignment, error: aError } = await supabase
                .from('student_assignments')
                .select(`
                    id,
                    routines (
                        id,
                        name,
                        description
                    )
                `)
                .eq('student_id', user!.id)
                .eq('is_active', true)
                .single();

            if (aError && aError.code !== 'PGRST116') throw aError;

            if (assignment?.routines) {
                setRoutine(assignment.routines);
                const { data: wData, error: wError } = await supabase
                    .from('workouts')
                    .select('*')
                    .eq('routine_id', (assignment.routines as any).id)
                    .order('order_index', { ascending: true });

                if (wError) throw wError;
                const sortedWorkouts = wData || [];
                setWorkouts(sortedWorkouts);

                // Fetch last log to determine suggestion
                const { data: lastLog, error: lError } = await supabase
                    .from('workout_logs')
                    .select('workout_id')
                    .eq('student_id', user!.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (!lError && lastLog) {
                    const lastIdx = sortedWorkouts.findIndex(w => w.id === lastLog.workout_id);
                    if (lastIdx !== -1) {
                        setSuggestedIndex((lastIdx + 1) % sortedWorkouts.length);
                    }
                }
            }

        } catch (error) {
            console.error('Error fetching selection:', error);
            toast.error('Erro ao carregar treinos.');
        } finally {
            setLoading(false);
        }
    };

    const getDifficultyColor = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes('iniciante') || lower.includes('a')) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30';
        if (lower.includes('avançado') || lower.includes('c')) return 'text-red-500 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30';
        return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30';
    };

    if (loading) return (
        <MainLayout>
            <div className="flex items-center justify-center h-[80vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        </MainLayout>
    );

    if (!routine) return (
        <MainLayout>
            <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-white/5">
                <Link to="/student/dashboard" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <span className="material-symbols-rounded text-slate-700 dark:text-slate-200">arrow_back_ios_new</span>
                </Link>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Seleção de Treino</h1>
                <div className="w-10"></div>
            </header>
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center space-y-4">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                    <span className="material-symbols-rounded text-4xl">fitness_center</span>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Nenhum treino ativo</h3>
                    <p className="text-slate-500 dark:text-slate-400">Aguarde seu coach atribuir uma nova rotina.</p>
                </div>
                <Link to="/student/dashboard" className="text-primary font-bold hover:underline">Voltar ao Início</Link>
            </div>
        </MainLayout>
    );

    return (
        <MainLayout>
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-72 h-72 bg-sky-400/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-40 left-0 w-56 h-56 bg-blue-400/10 rounded-full blur-3xl"></div>
            </div>

            <header className="relative sticky top-0 z-30 bg-white dark:bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-200/50 dark:border-white/5">
                <Link to="/student/dashboard" className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-sky-500 hover:border-sky-300 dark:hover:border-sky-600 transition-colors shadow-sm active:scale-95">
                    <span className="material-symbols-rounded text-xl">arrow_back</span>
                </Link>
                <div className="flex-1 px-4 text-center">
                    <h1 className="text-base font-bold text-slate-900 dark:text-white truncate">{routine.name}</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Rotina Atual</p>
                </div>
                <button className="p-2 -mr-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                    <span className="material-symbols-rounded">info</span>
                </button>
            </header>


            <main className="relative p-4 space-y-6">
                {/* Active Workout Banner */}
                {activeWorkout && (
                    <div className="bg-slate-900 dark:bg-slate-800 rounded-3xl p-5 shadow-xl border border-white/5 animate-slide-up">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 flex items-center justify-center text-sky-500 relative overflow-hidden">
                                <div className="absolute inset-0 bg-sky-500/10 animate-pulse"></div>
                                <span className="material-symbols-rounded text-2xl relative z-10">timer</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="text-white font-bold">Treino em andamento!</h4>
                                <p className="text-slate-400 text-xs text-left">Você tem um treino iniciado {new Date(activeWorkout.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <button
                                onClick={handleDiscardWorkout}
                                className="py-2.5 rounded-xl text-slate-400 font-bold text-sm bg-slate-800 hover:bg-slate-700 transition-colors border border-white/5"
                            >
                                Descartar
                            </button>
                            <button
                                onClick={() => navigate(`/student/workout/${activeWorkout.workoutId}`)}
                                className="py-2.5 rounded-xl bg-sky-500 text-white font-bold text-sm shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all"
                            >
                                Continuar
                            </button>
                        </div>
                    </div>
                )}

                {/* Routine Info Header */}
                <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-sky-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <span className="material-symbols-rounded text-9xl transform translate-x-4 -translate-y-4">fitness_center</span>
                    </div>
                    <div className="relative z-10">
                        <h2 className="font-bold text-2xl mb-1 font-display">Pronto para treinar?</h2>
                        <p className="text-blue-100 text-sm mb-4">Escolha seu treino de hoje e dê o seu melhor!</p>
                        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-lg px-3 py-1.5 w-fit border border-white/10">
                            <span className="material-symbols-rounded text-sm text-yellow-300">local_fire_department</span>
                            <span className="text-xs font-bold">Foco total hoje!</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-end px-1">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">Seus Treinos</h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{workouts.length} disponíveis</span>
                </div>

                <div className="space-y-4 pb-20">
                    {workouts.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                            <p className="text-slate-500">Esta rotina não tem treinos ainda.</p>
                        </div>
                    ) : (
                        workouts.map((workout, index) => {
                            // Helper to extract duration/exercises count if available (for now mocking or simplified)
                            // In real app, we might need to join 'workout_items' to get count.
                            // Assuming backend doesn't send count yet, we'll placeholder.
                            return (
                                <Link
                                    key={workout.id}
                                    to={`/student/workout/${workout.id}`}
                                    className="block group relative"
                                >
                                    {index === suggestedIndex && (
                                        <div className="absolute -top-3 left-4 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md z-10 flex items-center gap-1">
                                            <span className="material-symbols-rounded text-[12px]">recommend</span>
                                            SUGESTÃO
                                        </div>
                                    )}
                                    <div className={`
                                        bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border-2 transition-all hover:shadow-lg active:scale-[0.98] flex items-center gap-5
                                        ${index === suggestedIndex
                                            ? 'border-emerald-500/30 dark:border-emerald-500/30 hover:border-emerald-500 ring-4 ring-emerald-500/5 dark:ring-emerald-500/10'
                                            : 'border-slate-100 dark:border-slate-700 hover:border-sky-500/50'
                                        }
                                    `}>
                                        <div className={`
                                            w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl border
                                            ${index === suggestedIndex
                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-700 group-hover:bg-sky-500/5 group-hover:text-sky-500 group-hover:border-sky-500/20 transition-colors'
                                            }
                                        `}>
                                            {String.fromCharCode(65 + index)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-sky-500 transition-colors truncate">{workout.name}</h4>

                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="inline-flex items-center text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                    <span className="material-symbols-rounded text-[14px] mr-1 text-slate-400">timer</span>
                                                    ~60 min
                                                </span>
                                                <span className="inline-flex items-center text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                    <span className="material-symbols-rounded text-[14px] mr-1 text-slate-400">fitness_center</span>
                                                    Ver detalhes
                                                </span>
                                            </div>
                                        </div>

                                        <div className={`
                                            w-8 h-8 rounded-full flex items-center justify-center transition-colors
                                            ${index === suggestedIndex ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'text-slate-300 group-hover:text-primary group-hover:bg-primary/5'}
                                        `}>
                                            <span className="material-symbols-rounded">arrow_forward_ios</span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>
            </main>
        </MainLayout>
    );
};

export default Selection;