import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../../components/ThemeToggle';

import MainLayout from '../../components/Layout/MainLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import PWAInstallPrompt from '../../components/shared/PWAInstallPrompt';

interface DashboardStats {
    totalStudents: number;
    activeStudents: number;
    inactiveStudents: number;
    pendingStudents: number;
    activePercentage: number;
}

const CoachDashboard: React.FC = () => {
    const { user, role, expiresAt, avatarUrl } = useAuth();
    const [stats, setStats] = useState<DashboardStats>({
        totalStudents: 0,
        activeStudents: 0,
        inactiveStudents: 0,
        pendingStudents: 0,
        activePercentage: 0
    });

    const [recentFeedbacksCount, setRecentFeedbacksCount] = useState(0);
    const [updatesCount, setUpdatesCount] = useState(0);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;

            try {
                // 1. Fetch Students linked to this coach from students_data
                // Using 'students_data' instead of 'student_assignments' which was causing the bug
                let query = supabase
                    .from('students_data')
                    .select('id')
                    .eq('coach_id', user.id);

                const { data: students, error: studentsError } = await query;

                if (studentsError) {
                    console.error('Error fetching students:', studentsError);
                    return;
                }

                const studentIds = students?.map(s => s.id) || [];
                const totalCount = studentIds.length;

                // 2. Fetch Status from Profiles for these students
                let activeCount = 0;
                let pendingCount = 0;
                let inactiveCount = 0;

                if (totalCount > 0) {
                    const { data: profiles, error: profilesError } = await supabase
                        .from('profiles')
                        .select('status')
                        .in('id', studentIds);

                    if (!profilesError && profiles) {
                        activeCount = profiles.filter(p => p?.status === 'active').length;
                        pendingCount = profiles.filter(p => p?.status === 'pending').length;
                        inactiveCount = profiles.filter(p => p?.status === 'inactive' || p?.status === 'banned').length;
                    }
                }

                // 3. Update Stats
                setStats({
                    totalStudents: totalCount,
                    activeStudents: activeCount,
                    inactiveStudents: inactiveCount,
                    pendingStudents: pendingCount,
                    activePercentage: totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0
                });

                // 4. Calculate Updates Count
                let totalUpdates = pendingCount;

                // Check for students without active routines
                const activeStudentIds = profiles?.filter(p => p.status === 'active').map(p => p.id) || [];
                if (activeStudentIds.length > 0) {
                    const { data: assignments } = await supabase
                        .from('student_assignments')
                        .select('student_id')
                        .eq('is_active', true)
                        .in('student_id', activeStudentIds);

                    const withRoutine = new Set(assignments?.map(a => a.student_id));
                    const noRoutineCount = activeStudentIds.length - withRoutine.size;
                    totalUpdates += noRoutineCount;
                }

                // Check for expiring plans (next 7 days)
                const { data: expiringData } = await supabase
                    .from('students_data')
                    .select('consultancy_expires_at')
                    .eq('coach_id', user.id)
                    .not('consultancy_expires_at', 'is', null);

                const now = new Date();
                const sevenDays = new Date();
                sevenDays.setDate(now.getDate() + 7);

                const expiringCount = expiringData?.filter(s => {
                    const exp = new Date(s.consultancy_expires_at);
                    return exp <= sevenDays;
                }).length || 0;

                totalUpdates += expiringCount;
                setUpdatesCount(totalUpdates);

                // Fetch Feedback Count
                if (studentIds.length > 0) {
                    const { count, error: countError } = await supabase
                        .from('workout_logs')
                        .select('*', { count: 'exact', head: true })
                        .in('student_id', studentIds)
                        .eq('read_by_coach', false);

                    if (!countError) {
                        setRecentFeedbacksCount(count || 0);
                    }
                }

            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (stats.activePercentage / 100) * circumference;

    const [coachName, setCoachName] = useState('Treinador');

    useEffect(() => {
        if (user?.user_metadata?.name) {
            setCoachName(user.user_metadata.name.split(' ')[0]);
        }
    }, [user]);
    // ... (rest of the file)
    const currentHour = new Date().getHours();
    let greeting = 'Bom dia';
    if (currentHour >= 12 && currentHour < 18) {
        greeting = 'Boa tarde';
    } else if (currentHour >= 18) {
        greeting = 'Boa noite';
    }

    return (
        <MainLayout>

            {/* Clean Header */}
            <header className="bg-white dark:bg-slate-800 pt-12 pb-8 px-6 border-b border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-start mb-6">
                    <Link to="/coach/profile" className="flex items-center gap-4 group cursor-pointer transition-opacity hover:opacity-80">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 shadow-soft border-2 border-slate-100 dark:border-slate-600">
                            {avatarUrl || user?.user_metadata?.avatar_url ? (
                                <img
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                    src={avatarUrl || user?.user_metadata?.avatar_url}
                                />
                            ) : (
                                <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                                    <span className="material-symbols-rounded text-3xl">account_circle</span>
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Bem-vindo de volta!</p>
                            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white capitalize">
                                {greeting}, {coachName}
                            </h1>
                        </div>
                    </Link>
                    <div className="flex flex-col items-end gap-2">
                        <ThemeToggle />
                        {role === 'coach' && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-full">
                                <span className={`w-2 h-2 rounded-full ${expiresAt && new Date(expiresAt) > new Date() ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-tight">
                                    {(() => {
                                        if (!expiresAt) return 'Sem validade';
                                        const now = new Date();
                                        const exp = new Date(expiresAt);
                                        const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                        return diff <= 0 ? 'Expirado' : `${diff} dias restantes`;
                                    })()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Students Overview Card */}
                <Link
                    to="/coach/students"
                    className="block bg-slate-900 rounded-2xl p-5 text-white relative overflow-hidden group card-hover shadow-lg shadow-slate-200/50 dark:shadow-none"
                >
                    <div className="relative z-10 flex justify-between items-center">
                        <div>
                            <h2 className="font-display text-2xl font-bold mb-1">Alunos</h2>
                            <p className="text-white/70 text-sm mb-4">Visão geral</p>
                            <div className="flex flex-col gap-2">
                                <span className="text-xs font-semibold uppercase tracking-wider text-white/50">Status atual</span>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full">
                                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                        <span className="text-xs font-semibold">{stats.activeStudents} Ativos</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full">
                                        <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                                        <span className="text-xs font-semibold">{stats.pendingStudents} Pendentes</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full">
                                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                        <span className="text-xs font-semibold">{stats.inactiveStudents} Inativos</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Progress Ring */}
                        <div className="relative w-20 h-20 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r={radius} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                                <circle
                                    cx="18" cy="18" r={radius} fill="none"
                                    stroke="white" strokeWidth="3"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-lg font-bold">{stats.activePercentage}%</span>
                                <span className="text-[10px] text-white/70 uppercase">Ativos</span>
                            </div>
                        </div>
                    </div>
                    {/* Decorative Element */}
                    <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                </Link>
            </header>

            <main className="flex-1 px-5 pt-6 space-y-5">
                <PWAInstallPrompt />
                {/* Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Link to="/coach/feedbacks" className="bg-gradient-to-br from-sky-50/80 to-white dark:from-sky-900/20 dark:to-slate-800 p-4 rounded-2xl shadow-sm border border-sky-100/50 dark:border-sky-700/30 flex flex-col items-center justify-center gap-3 group active:scale-95 transition-all h-28 relative card-hover overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-sky-100/20 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="relative p-3 bg-white dark:bg-sky-900/40 text-primary rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                            <span className="material-symbols-rounded text-2xl">chat_bubble</span>
                            {recentFeedbacksCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-danger text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800">
                                    {recentFeedbacksCount}
                                </span>
                            )}
                        </div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 relative z-10">Feedbacks</span>
                    </Link>
                    <Link to="/coach/updates" className="bg-gradient-to-br from-amber-50/80 to-white dark:from-amber-900/20 dark:to-slate-800 p-4 rounded-2xl shadow-sm border border-amber-100/50 dark:border-amber-700/30 flex flex-col items-center justify-center gap-3 group active:scale-95 transition-all h-28 relative card-hover overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-amber-100/20 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="relative p-3 bg-white dark:bg-amber-900/40 text-warning rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                            <span className="material-symbols-rounded text-2xl">calendar_month</span>
                            {updatesCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-danger text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800">
                                    {updatesCount}
                                </span>
                            )}
                        </div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 relative z-10">Atualizações</span>
                    </Link>
                </div>

                {/* Tool Banner (Invite) - Increased margin top to separate from quick actions */}
                <Link to="/coach/invite" className="block mt-4">
                    <div className="w-full bg-white dark:bg-slate-800 p-5 rounded-2xl flex items-center justify-between group cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-primary uppercase tracking-wide">Ferramenta</span>
                            <span className="text-lg font-bold text-slate-900 dark:text-white font-display">"Convidar Aluno"</span>
                        </div>
                        <div className="h-12 w-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-soft text-primary group-hover:scale-110 transition-transform">
                            <span className="material-symbols-rounded">person_add</span>
                        </div>
                    </div>
                </Link>

                {/* Library Cards - Added mt-8 for better spacing */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-12 mt-8">
                    <Link to="/coach/library" className="bg-gradient-to-br from-amber-50/80 to-white dark:from-amber-900/20 dark:to-slate-800 p-5 rounded-2xl shadow-sm border border-amber-100/50 dark:border-amber-700/30 flex flex-col items-start gap-4 text-left group active:scale-95 transition-all card-hover overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-100/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="p-2.5 bg-white dark:bg-amber-900/40 rounded-xl text-warning shadow-sm relative z-10">
                            <span className="material-symbols-rounded text-2xl">fitness_center</span>
                        </div>
                        <div className="relative z-10">
                            <span className="font-display text-xl font-bold block text-slate-900 dark:text-white">Treinos</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase mt-1 block tracking-wide">Biblioteca</span>
                        </div>
                    </Link>
                    <Link to="/coach/exercises" className="bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-900/20 dark:to-slate-800 p-5 rounded-2xl shadow-sm border border-emerald-100/50 dark:border-emerald-700/30 flex flex-col items-start gap-4 text-left group active:scale-95 transition-all card-hover overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="p-2.5 bg-white dark:bg-emerald-900/40 rounded-xl text-success shadow-sm relative z-10">
                            <span className="material-symbols-rounded text-2xl">play_circle</span>
                        </div>
                        <div className="relative z-10">
                            <span className="font-display text-xl font-bold block text-slate-900 dark:text-white">Exercícios</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase mt-1 block tracking-wide">Biblioteca</span>
                        </div>
                    </Link>
                </div>
            </main>
        </MainLayout>
    );
};

export default CoachDashboard;