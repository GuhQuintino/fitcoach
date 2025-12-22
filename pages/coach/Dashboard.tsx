import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../../components/ThemeToggle';
import MainLayout from '../../layouts/MainLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';

interface DashboardStats {
    totalStudents: number;
    activeStudents: number;
    inactiveStudents: number;
    pendingStudents: number;
    activePercentage: number;
}

const CoachDashboard: React.FC = () => {
    const { user, role } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats>({
        totalStudents: 0,
        activeStudents: 0,
        inactiveStudents: 0,
        pendingStudents: 0,
        activePercentage: 0
    });
    const [recentFeedbacksCount, setRecentFeedbacksCount] = useState(0);
    const [updatesCount, setUpdatesCount] = useState(0);

    // Get Greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const coachName = user?.user_metadata?.full_name?.split(' ')[0] || 'Coach';

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Students Stats
            const { data: studentsData, error: studentsError } = await supabase
                .from('students_data')
                .select('id, consultancy_expires_at, profiles:id (status)')
                .eq('coach_id', user!.id);

            if (studentsError) throw studentsError;

            // Helper to determine status based on Expiration Date (Matches Students.tsx logic exactly)
            const getStudentState = (student: any) => {
                const status = student.profiles?.status;
                const expiresAt = student.consultancy_expires_at;

                if (status === 'pending') return 'pending';

                if (status === 'active') {
                    if (expiresAt) {
                        const now = new Date();
                        const exp = new Date(expiresAt);
                        if (exp < now) return 'expired'; // Treat as inactive
                    }
                    return 'active';
                }

                return 'inactive';
            };

            let active = 0;
            let inactive = 0;
            let pending = 0;
            let expiringSoon = 0;
            let activeStudentIds: string[] = [];

            const fiveDaysFromNow = new Date();
            fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
            const now = new Date();

            studentsData?.forEach((student: any) => {
                const state = getStudentState(student);
                if (state === 'active') {
                    active++;
                    activeStudentIds.push(student.id);

                    // Check if expiring soon
                    if (student.consultancy_expires_at) {
                        const exp = new Date(student.consultancy_expires_at);
                        if (exp <= fiveDaysFromNow && exp >= now) {
                            expiringSoon++;
                        }
                    }
                }
                else if (state === 'pending') pending++;
                else {
                    inactive++;
                    // If expired, it counts as an update alert? 
                    // User said: "2 alunos precisam ter uma revisão... ou sem treino ou plano vencendo".
                    // Expired students usually need renewal.
                    if (state === 'expired') expiringSoon++;
                }
            });

            // Total = All managed students
            const total = studentsData?.length || 0;

            // For the Percentage Ring: ACTIVE / (ACTIVE + INACTIVE) * 100
            // We usually exclude Pending from the "Activity Score" because they haven't started yet.
            const totalForPercentage = active + inactive;
            const percentage = totalForPercentage > 0 ? Math.round((active / totalForPercentage) * 100) : 0;

            setStats({
                totalStudents: total,
                activeStudents: active,
                inactiveStudents: inactive,
                pendingStudents: pending,
                activePercentage: percentage
            });

            // 2. Fetch Recent Feedbacks Count (Unread or from last 3 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { count: feedbackCount, error: feedbackError } = await supabase
                .from('workout_logs')
                .select('id', { count: 'exact', head: true })
                .gte('created_at', sevenDaysAgo.toISOString());

            if (!feedbackError) {
                setRecentFeedbacksCount(feedbackCount || 0);
            }

            // 3. Updates Count (Expiring/Expired + Active without Assignments)
            let missingRoutineCount = 0;
            if (activeStudentIds.length > 0) {
                const { data: assignments, error: assignmentsError } = await supabase
                    .from('student_assignments')
                    .select('student_id')
                    .eq('is_active', true)
                    .in('student_id', activeStudentIds);

                if (!assignmentsError && assignments) {
                    const withRoutine = new Set(assignments.map((a: any) => a.student_id));
                    missingRoutineCount = activeStudentIds.filter(id => !withRoutine.has(id)).length;
                }
            }

            setUpdatesCount(expiringSoon + missingRoutineCount);


        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate Stroke Dash for Progress Ring
    const radius = 15.5;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (stats.activePercentage / 100) * circumference;

    return (
        <MainLayout className="pb-24">
            {/* Clean Header */}
            <header className="bg-white dark:bg-slate-800 pt-12 pb-8 px-6 border-b border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-start mb-6">
                    <Link to="/coach/profile" className="flex items-center gap-4 group cursor-pointer transition-opacity hover:opacity-80">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 shadow-soft border-2 border-slate-100 dark:border-slate-600">
                            {user?.user_metadata?.avatar_url ? (
                                <img
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                    src={user.user_metadata.avatar_url}
                                />
                            ) : (
                                <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                                    <span className="material-symbols-rounded">person</span>
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
                    <ThemeToggle />
                </div>

                {/* Students Overview Card */}
                <Link
                    to="/coach/students"
                    className="block bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-5 text-white relative overflow-hidden group card-hover"
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
                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <Link to="/coach/feedbacks" className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center gap-3 group active:scale-95 transition-all h-28 relative card-hover">
                        <div className="relative p-3 bg-sky-50 dark:bg-sky-900/30 text-primary rounded-xl group-hover:scale-110 transition-transform">
                            <span className="material-symbols-rounded text-2xl">chat_bubble</span>
                            {recentFeedbacksCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-danger text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800">
                                    {recentFeedbacksCount}
                                </span>
                            )}
                        </div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Feedbacks</span>
                    </Link>
                    <Link to="/coach/updates" className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center gap-3 group active:scale-95 transition-all h-28 relative card-hover">
                        <div className="relative p-3 bg-amber-50 dark:bg-amber-900/30 text-warning rounded-xl group-hover:scale-110 transition-transform">
                            <span className="material-symbols-rounded text-2xl">calendar_month</span>
                            {updatesCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-danger text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800">
                                    {updatesCount}
                                </span>
                            )}
                        </div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Atualizações</span>
                    </Link>
                </div>

                {/* Tool Banner (Invite) */}
                <Link to="/coach/invite">
                    <div className="w-full bg-primary-50 dark:bg-primary/10 p-5 rounded-2xl flex items-center justify-between group cursor-pointer transition-colors hover:bg-primary-100 dark:hover:bg-primary/20 border border-primary-100 dark:border-primary/20">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-primary uppercase tracking-wide">Ferramenta</span>
                            <span className="text-lg font-bold text-slate-900 dark:text-white font-display">"Convidar Aluno"</span>
                        </div>
                        <div className="h-12 w-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-soft text-primary group-hover:scale-110 transition-transform">
                            <span className="material-symbols-rounded">person_add</span>
                        </div>
                    </div>
                </Link>

                {/* Library Cards */}
                <div className="grid grid-cols-2 gap-4 pb-4">
                    <Link to="/coach/library" className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 flex flex-col items-start gap-4 text-left group active:scale-95 transition-all card-hover">
                        <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-warning">
                            <span className="material-symbols-rounded text-2xl">fitness_center</span>
                        </div>
                        <div>
                            <span className="font-display text-xl font-bold block text-slate-900 dark:text-white">Treinos</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase mt-1 block tracking-wide">Biblioteca</span>
                        </div>
                    </Link>
                    <Link to="/coach/exercises" className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 flex flex-col items-start gap-4 text-left group active:scale-95 transition-all card-hover">
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-success">
                            <span className="material-symbols-rounded text-2xl">play_circle</span>
                        </div>
                        <div>
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