import React, { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

const Updates: React.FC = () => {
    const { user } = useAuth();
    const [expiringStudents, setExpiringStudents] = useState<any[]>([]);
    const [noRoutineStudents, setNoRoutineStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchUpdates();
        }
    }, [user]);

    const fetchUpdates = async () => {
        try {
            setLoading(true);
            const now = new Date();
            const fiveDaysFromNow = new Date();
            fiveDaysFromNow.setDate(now.getDate() + 5);

            // 1. Fetch Students with Expiring Plans or Expired
            // Expired: consultancy_expires_at < now (AND status = active)
            // Expiring: consultancy_expires_at <= fiveDaysFromNow (AND status = active)
            const { data: studentsData, error: studentsError } = await supabase
                .from('students_data')
                .select(`
                    id, 
                    consultancy_expires_at, 
                    profiles:id (
                        id,
                        full_name,
                        avatar_url,
                        status
                    )
                `)
                .eq('coach_id', user!.id);

            if (studentsError) throw studentsError;

            const expiringOrExpired = studentsData?.filter((s: any) => {
                const status = s.profiles.status;
                if (status !== 'active') return false;
                if (!s.consultancy_expires_at) return false;

                const exp = new Date(s.consultancy_expires_at);
                // Check if expired or expiring soon
                return exp <= fiveDaysFromNow;
            }) || [];

            setExpiringStudents(expiringOrExpired);

            // 2. Fetch Active Students without Active Routine
            // We need to check if they have any active assignment in 'student_assignments'

            // First get all active student IDs
            const activeStudentIds = studentsData?.filter((s: any) => s.profiles.status === 'active').map((s: any) => s.id) || [];

            if (activeStudentIds.length > 0) {
                const { data: assignments, error: assignmentsError } = await supabase
                    .from('student_assignments')
                    .select('student_id')
                    .eq('is_active', true)
                    .in('student_id', activeStudentIds);

                if (assignmentsError) throw assignmentsError;

                const withRoutine = new Set(assignments?.map((a: any) => a.student_id));
                const withoutRoutine = studentsData?.filter((s: any) =>
                    s.profiles.status === 'active' && !withRoutine.has(s.id)
                ) || [];

                setNoRoutineStudents(withoutRoutine);
            } else {
                setNoRoutineStudents([]);
            }

        } catch (error) {
            console.error('Error fetching updates:', error);
        } finally {
            setLoading(false);
        }
    };

    const getDaysRemaining = (dateString: string) => {
        const diff = new Date(dateString).getTime() - new Date().getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    return (
        <MainLayout className="pb-24">
            <header className="px-5 py-6 flex items-center gap-4">
                <Link to="/coach/dashboard" className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 shadow-sm border border-slate-100 dark:border-slate-700">
                    <span className="material-symbols-rounded">arrow_back</span>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">Atualizações</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Pendências urgentes</p>
                </div>
            </header>

            <main className="px-5 space-y-8">
                {/* Section: Expiring Plans */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-rounded text-amber-500">warning</span>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Planos Vencendo</h2>
                    </div>

                    <div className="space-y-3">
                        {loading ? (
                            <div className="animate-pulse flex space-x-4">
                                <div className="flex-1 space-y-4 py-1">
                                    <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
                                </div>
                            </div>
                        ) : expiringStudents.length === 0 ? (
                            <p className="text-sm text-slate-400 italic">Nenhum plano vencendo esta semana.</p>
                        ) : (
                            expiringStudents.map(student => {
                                const days = getDaysRemaining(student.consultancy_expires_at);
                                const isExpired = days < 0;

                                return (
                                    <div key={student.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-soft border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={student.profiles.avatar_url || `https://ui-avatars.com/api/?name=${student.profiles.full_name}&background=random`}
                                                alt=""
                                                className="w-10 h-10 rounded-full bg-slate-100"
                                            />
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-white text-sm">{student.profiles.full_name}</h3>
                                                <p className={`text-xs font-bold ${isExpired ? 'text-red-500' : 'text-amber-500'}`}>
                                                    {isExpired ? 'VENCIDO' : `Vence em ${days} dias`}
                                                </p>
                                            </div>
                                        </div>
                                        <Link
                                            to="/coach/students"
                                            className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-colors"
                                        >
                                            Renovar
                                        </Link>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>

                {/* Section: Missing Routines */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-rounded text-red-500">assignment_late</span>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Sem Treino Ativo</h2>
                    </div>

                    <div className="space-y-3">
                        {loading ? (
                            <div className="animate-pulse flex space-x-4">
                                <div className="flex-1 space-y-4 py-1">
                                    <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
                                </div>
                            </div>
                        ) : noRoutineStudents.length === 0 ? (
                            <p className="text-sm text-slate-400 italic">Todos os alunos ativos possuem treinos.</p>
                        ) : (
                            noRoutineStudents.map(student => (
                                <div key={student.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-soft border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={student.profiles.avatar_url || `https://ui-avatars.com/api/?name=${student.profiles.full_name}&background=random`}
                                            alt=""
                                            className="w-10 h-10 rounded-full bg-slate-100"
                                        />
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">{student.profiles.full_name}</h3>
                                            <p className="text-xs text-red-400">Sem rotina atribuída</p>
                                        </div>
                                    </div>
                                    <Link
                                        to={`/coach/library`}
                                        className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-colors"
                                    >
                                        Atribuir
                                    </Link>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </main>
        </MainLayout>
    );
};

export default Updates;
