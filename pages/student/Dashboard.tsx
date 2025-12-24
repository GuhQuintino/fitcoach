import React, { useEffect, useState } from 'react';
import MainLayout from '../../components/Layout/MainLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from '../../components/ThemeToggle';

const StudentDashboard: React.FC = () => {
    const { user, expiresAt } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [coach, setCoach] = useState<any>(null);
    const [routine, setRoutine] = useState<any>(null);
    const [studentData, setStudentData] = useState<any>(null);
    const [workoutCount, setWorkoutCount] = useState(0);
    const [gamification, setGamification] = useState({ streak: 0, level: 1, current_xp: 0, next_level_xp: 1000 });
    const [activeWorkout, setActiveWorkout] = useState<any>(null);

    useEffect(() => {
        if (user) {
            fetchStudentData();
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

    const fetchStudentData = async () => {
        try {
            setLoading(true);

            // ... (existing fetch calls for profile, studentData, etc) ...
            // 1. Fetch Profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user!.id)
                .single();
            setProfile(profileData);

            // 2. Fetch Student Data (Coach & Expiration)
            const { data: sData } = await supabase
                .from('students_data')
                .select('*')
                .eq('id', user!.id)
                .single();
            setStudentData(sData);

            // Fetch Coach Info if exists
            if (sData?.coach_id) {
                const { data: coachData } = await supabase
                    .from('profiles')
                    .select('full_name, avatar_url, phone')
                    .eq('id', sData.coach_id)
                    .single();
                setCoach(coachData);
            }

            // PENDING CHECK
            if (profileData?.status === 'pending') {
                setLoading(false);
                return;
            }

            // Fetch Active Routine
            const { data: assignment } = await supabase
                .from('student_assignments')
                .select('routine_id, routines(name, duration_weeks)')
                .eq('student_id', user!.id)
                .eq('is_active', true)
                .single();
            setRoutine(assignment);

            // Fetch Workout Count & Logs for Gamification
            const { data: logs, error: logsError, count } = await supabase
                .from('workout_logs')
                .select('completed_at', { count: 'exact', head: false })
                .eq('student_id', user!.id)
                .eq('completed', true)
                .order('completed_at', { ascending: false });

            setWorkoutCount(count || 0);

            if (logs) {
                // --- CLIENT-SIDE GAMIFICATION CALCULATION ---
                // 1. Level Calculation (1 workout = 100 XP, Level up every 1000 XP)
                const totalWorkouts = count || 0;
                const current_xp = totalWorkouts * 100;
                const level = Math.floor(current_xp / 1000) + 1;
                const next_level_xp = level * 1000;

                // 2. Streak Calculation
                let streak = 0;
                if (logs.length > 0) {
                    const uniqueDates = [...new Set(logs.map(log => new Date(log.completed_at).toDateString()))];

                    if (uniqueDates.length > 0) {
                        const today = new Date().toDateString();
                        const yesterday = new Date(Date.now() - 86400000).toDateString();
                        const lastWorkoutDate = uniqueDates[0];

                        // Streak is active if last workout was today or yesterday
                        if (lastWorkoutDate === today || lastWorkoutDate === yesterday) {
                            streak = 1;
                            // Check previous days
                            for (let i = 1; i < uniqueDates.length; i++) {
                                const prevDate = new Date(uniqueDates[i]);
                                const currDate = new Date(uniqueDates[i - 1]);
                                const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                if (diffDays === 1) {
                                    streak++;
                                } else {
                                    break;
                                }
                            }
                        }
                    }
                }

                setGamification({
                    streak,
                    level,
                    current_xp,
                    next_level_xp
                });
            }

        } catch (error) {
            console.error('Error fetching student data:', error);
        } finally {
            setLoading(false);
        }
    };

    // ... (rest of helper functions) ...
    const calculateDaysRemaining = () => {
        if (!expiresAt) return null;
        const expires = new Date(expiresAt);
        const now = new Date();
        const diffTime = expires.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const daysRemaining = calculateDaysRemaining();
    const isExpired = daysRemaining !== null && daysRemaining < 0; // Blocks after 24h grace period

    // ... (loading, pending, expired screens remain same) ...

    if (loading) return (
        <MainLayout>
            <div className="flex items-center justify-center h-[80vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        </MainLayout>
    );

    // PENDING SCREEN
    if (profile?.status === 'pending') {
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center space-y-6">
                    <div className="w-24 h-24 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center animate-pulse">
                        <span className="material-symbols-rounded text-5xl text-amber-500">hourglass_top</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Aguardando Aprovação</h1>
                        <p className="text-slate-500 dark:text-slate-400">
                            Seu cadastro foi realizado com sucesso! Aguarde o coach <strong>{coach?.full_name || 'seu treinador'}</strong> ativar sua conta.
                        </p>
                    </div>

                    {coach?.phone && (
                        <a
                            href={`https://wa.me/${coach.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-[#20bd5a] transition-all transform active:scale-95"
                        >
                            <span className="material-symbols-rounded">chat</span>
                            Falar com Coach
                        </a>
                    )}
                </div>
            </MainLayout>
        );
    }

    // EXPIRED SCREEN
    if (isExpired) {
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center space-y-6">
                    <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <span className="material-symbols-rounded text-5xl text-red-500">event_busy</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Plano Vencido</h1>
                        <p className="text-slate-500 dark:text-slate-400">
                            Sua consultoria encerrou em <strong>{new Date(studentData.consultancy_expires_at).toLocaleDateString()}</strong>.
                            <br />Entre em contato com <strong>{coach?.full_name || 'seu coach'}</strong> para renovar.
                        </p>
                    </div>

                    {coach?.phone && (
                        <a
                            href={`https://wa.me/${coach.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-[#20bd5a] transition-all transform active:scale-95"
                        >
                            <span className="material-symbols-rounded">chat</span>
                            Renovar Agora
                        </a>
                    )}
                </div>
            </MainLayout>
        );
    }

    // ACTIVE DASHBOARD
    return (
        <MainLayout>
            {/* Rich Header */}
            <header className="bg-white dark:bg-slate-800 rounded-b-[2.5rem] px-6 pt-12 pb-8 shadow-sm relative z-10 transition-colors duration-300">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Profile" className="w-14 h-14 rounded-2xl object-cover border-2 border-white dark:border-slate-700 shadow-sm" />
                            ) : (
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-slate-400 font-bold border-2 border-white dark:border-slate-700 shadow-sm">
                                    <span className="text-xl">{profile?.full_name?.charAt(0)}</span>
                                </div>
                            )}
                            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
                        </div>
                        <div>
                            <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider mb-0.5">Bem-vindo(a)</p>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display leading-tight">
                                {profile?.full_name?.split(' ')[0]}
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Streak Badge - Only show if > 0 */}
                        {gamification.streak > 0 && (
                            <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 px-3 py-1.5 rounded-full border border-orange-200 dark:border-orange-800/50 animate-fade-in">
                                <span className="material-symbols-rounded text-orange-500 text-lg">local_fire_department</span>
                                <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{gamification.streak} dias</span>
                            </div>
                        )}
                        <ThemeToggle />
                        <button className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors relative active:scale-95">
                            <span className="material-symbols-rounded">notifications</span>
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-800"></span>
                        </button>
                    </div>
                </div>

                {/* Plan Status Overview */}
                {daysRemaining !== null ? (
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full border-[3px] border-primary/20 border-t-primary flex items-center justify-center rotate-45">
                                <span className="material-symbols-rounded text-primary -rotate-45">fitness_center</span>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Plano Atual</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">Consultoria Pro</p>
                            </div>
                            <div className="mt-1">
                                {/* XP Progress Bar */}
                                <div className="h-1.5 w-24 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden relative">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${(gamification.current_xp % 1000) / 10}%` }}
                                    ></div>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1 font-medium">Nível {gamification.level} ({gamification.current_xp} XP)</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Expira em</p>
                            <p className={`text-sm font-bold ${daysRemaining < 7 ? 'text-red-500' : 'text-primary'}`}>
                                {daysRemaining} dias
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50">
                        <p className="text-slate-500 text-sm">Sem plano ativo</p>
                    </div>
                )}
            </header>

            <main className="px-6 -mt-4 space-y-6 relative z-20">
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
                                <p className="text-slate-400 text-xs">Você tem um treino iniciado {new Date(activeWorkout.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.</p>
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

                {/* Hero Carousel (Swipeable Area) */}
                <section className="overflow-x-auto snap-x snap-mandatory flex gap-4 pb-4 no-scrollbar">
                    {/* Card 1: Active Workout */}
                    <div className="snap-center shrink-0 w-full relative">
                        {routine ? (
                            <div
                                onClick={() => navigate('/student/selection')}
                                className="bg-gradient-to-br from-primary to-primary-dark rounded-[2rem] p-6 text-white shadow-xl shadow-primary/20 relative overflow-hidden h-48 flex flex-col justify-between group cursor-pointer transition-transform active:scale-[0.98]"
                            >
                                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-white/20 transition-colors"></div>
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>

                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-wide border border-white/10">Treino Atual</span>
                                            <span className="px-2 py-0.5 bg-green-500/20 text-green-100 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-wide border border-green-400/20">Ativo</span>
                                        </div>
                                        <h2 className="text-2xl font-bold font-display leading-tight">{routine.routines.name}</h2>
                                    </div>
                                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/10">
                                        <span className="material-symbols-rounded font-bold arrow-forward">arrow_forward</span>
                                    </div>
                                </div>
                                <div className="relative z-10">
                                    <p className="text-blue-100 text-sm">Toque para ver seus treinos</p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 h-48 flex flex-col items-center justify-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-300">
                                    <span className="material-symbols-rounded text-2xl">fitness_center</span>
                                </div>
                                <div>
                                    <p className="text-slate-900 dark:text-white font-bold">Sem treino ativo</p>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">Aguarde seu coach atribuir um plano.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Quick Actions Grid */}
                <div>
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Acesso Rápido</h3>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <Link to="/student/history" className="bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-900/20 dark:to-slate-800 p-5 rounded-2xl shadow-sm border border-emerald-100/50 dark:border-emerald-700/30 active:scale-[0.98] transition-all hover:shadow-emerald-100/50 dark:hover:shadow-none group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                            <div className="w-12 h-12 bg-white dark:bg-emerald-900/40 rounded-2xl flex items-center justify-center text-emerald-500 dark:text-emerald-400 mb-4 group-hover:scale-110 transition-transform shadow-sm relative z-10">
                                <span className="material-symbols-rounded text-2xl">history</span>
                            </div>
                            <span className="font-bold text-lg text-slate-900 dark:text-white block mb-0.5 relative z-10">Histórico</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium relative z-10">{workoutCount} treinos feitos</span>
                        </Link>

                        <div className="bg-gradient-to-br from-purple-50/80 to-white dark:from-purple-900/20 dark:to-slate-800 p-5 rounded-2xl shadow-sm border border-purple-100/50 dark:border-purple-700/30 active:scale-[0.98] transition-all opacity-80 cursor-not-allowed group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-100/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                            <div className="w-12 h-12 bg-white dark:bg-purple-900/40 rounded-2xl flex items-center justify-center text-purple-500 dark:text-purple-400 mb-4 shadow-sm relative z-10">
                                <span className="material-symbols-rounded text-2xl">analytics</span>
                            </div>
                            <span className="font-bold text-lg text-slate-900 dark:text-white block mb-0.5 relative z-10">Evolução</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium relative z-10">Em breve</span>
                        </div>
                    </div>
                </div>

                {/* Daily Motivation / Extras */}
                <div className="bg-indigo-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-lg shadow-indigo-900/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/30 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/30 rounded-full blur-3xl"></div>

                    <div className="relative z-10 flex items-start justify-between">
                        <div>
                            <span className="block text-indigo-200 text-xs font-bold uppercase tracking-wider mb-2">Dica do dia</span>
                            <p className="font-display font-medium text-lg leading-relaxed max-w-[80%]">
                                "A consistência é mais importante que a intensidade."
                            </p>
                        </div>
                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md">
                            <span className="material-symbols-rounded text-indigo-100">lightbulb</span>
                        </div>
                    </div>
                </div>
            </main>
        </MainLayout>
    );
};

export default StudentDashboard;