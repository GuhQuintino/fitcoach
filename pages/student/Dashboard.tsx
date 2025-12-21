import React, { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Link } from 'react-router-dom';

const StudentDashboard: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [coach, setCoach] = useState<any>(null);
    const [routine, setRoutine] = useState<any>(null);

    useEffect(() => {
        if (user) {
            fetchStudentData();
        }
    }, [user]);

    const fetchStudentData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Profile + Coach Stats (Mocked or Real)
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user!.id)
                .single();
            setProfile(profileData);

            if (profileData?.status === 'pending') {
                const { data: studentData } = await supabase
                    .from('students_data')
                    .select('coach_id')
                    .eq('id', user!.id)
                    .single();

                if (studentData?.coach_id) {
                    const { data: coachData } = await supabase
                        .from('profiles')
                        .select('full_name, avatar_url, phone')
                        .eq('id', studentData.coach_id)
                        .single();
                    setCoach(coachData);
                }
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

        } catch (error) {
            console.error('Error fetching student data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <MainLayout className="bg-slate-50 dark:bg-slate-900">
            <div className="flex items-center justify-center h-[80vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        </MainLayout>
    );

    if (profile?.status === 'pending') {
        return (
            <MainLayout className="bg-slate-50 dark:bg-slate-900">
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

    // Active Dashboard
    return (
        <MainLayout className="pb-28 bg-slate-50 dark:bg-slate-900">
            {/* Rich Header */}
            <header className="bg-white dark:bg-slate-800 rounded-b-[2.5rem] px-6 pt-12 pb-8 shadow-soft relative z-10">
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
                    <button className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors relative">
                        <span className="material-symbols-rounded">notifications</span>
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-800"></span>
                    </button>
                </div>

                {/* Plan Status Overview */}
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border-[3px] border-primary/20 border-t-primary flex items-center justify-center rotate-45">
                            <div className="w-full h-full flex items-center justify-center -rotate-45">
                                <span className="text-[10px] font-bold text-primary">75%</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Plano Atual</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">Consultoria Pro</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Expira em</p>
                        <p className="text-sm font-bold text-primary">25 dias</p>
                    </div>
                </div>
            </header>

            <main className="px-6 -mt-4 space-y-6 relative z-20">
                {/* Hero Carousel (Swipeable Area) */}
                <section className="overflow-x-auto snap-x snap-mandatory flex gap-4 pb-4 no-scrollbar">
                    {/* Card 1: Active Workout */}
                    <div className="snap-center shrink-0 w-full relative">
                        {routine ? (
                            <div className="bg-gradient-to-br from-primary to-primary-dark rounded-[2rem] p-6 text-white shadow-xl shadow-primary/20 relative overflow-hidden h-48 flex flex-col justify-between group cursor-pointer transition-transform active:scale-[0.98]">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-white/20 transition-colors"></div>
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>

                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-wide border border-white/10">Treino A</span>
                                            <span className="px-2 py-0.5 bg-green-500/20 text-green-100 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-wide border border-green-400/20">Hoje</span>
                                        </div>
                                        <h2 className="text-2xl font-bold font-display leading-tight">{routine.routines.name}</h2>
                                    </div>
                                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/10">
                                        <span className="material-symbols-rounded font-bold arrow-forward">arrow_forward</span>
                                    </div>
                                </div>

                                <div className="relative z-10">
                                    <div className="flex items-center justify-between text-sm font-medium text-blue-50 mb-2">
                                        <span>Progresso Semanal</span>
                                        <span>2/4</span>
                                    </div>
                                    <div className="w-full bg-black/20 rounded-full h-1.5 overflow-hidden">
                                        <div className="bg-white h-full w-[50%] rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                                    </div>
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
                        <button className="text-primary text-sm font-bold">Ver tudo</button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Link to="/student/history" className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 active:scale-[0.98] transition-all hover:border-primary/30 group">
                            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-500 dark:text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-rounded text-2xl">history</span>
                            </div>
                            <span className="font-bold text-lg text-slate-900 dark:text-white block mb-0.5">Histórico</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">32 treinos feitos</span>
                        </Link>

                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 active:scale-[0.98] transition-all opacity-60 cursor-not-allowed">
                            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center text-purple-500 dark:text-purple-400 mb-4">
                                <span className="material-symbols-rounded text-2xl">analytics</span>
                            </div>
                            <span className="font-bold text-lg text-slate-900 dark:text-white block mb-0.5">Evolução</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Em breve</span>
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