import React, { useEffect, useState } from 'react';
import MainLayout from '../../components/Layout/MainLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

const SYSTEM_RELEASES = [
    {
        version: 'v2.4.0',
        date: 'Out 2026',
        title: 'Calculadora Metabólica Inteligente & Consolidação Single-Coach',
        icon: 'local_fire_department',
        highlights: [
            'Cálculo de TMB (Mifflin-St Jeor) e Manutenção Calórica blindado contra erros de digitação de peso/altura.',
            'Fator de atividade física dinâmico sincronizado com a frequência semanal da rotina do aluno.',
            'Calendário mensal interativo no Histórico com rolagem direta até o treino realizado.',
            'Fluxo de recuperação de senha e direitos LGPD integrados via WhatsApp direto.'
        ]
    },
    {
        version: 'v2.3.0',
        date: 'Out 2026',
        title: 'Motor de Notificações Inteligentes & Anti-Spam',
        icon: 'notifications_active',
        highlights: [
            'Inferência automática dos dias e horários habituais de treino de cada aluno.',
            '4 escudos anti-spam: silêncio pós-treino, teto diário/semanal, Quiet Hours em Brasília e Backoff de 5 dias.',
            'Envio nativo Web Push (PWA/VAPID) e lembretes inteligentes de preenchimento de perfil.'
        ]
    },
    {
        version: 'v2.2.0',
        date: 'Out 2026',
        title: 'Séries Especiais em 4 Camadas & Templates Avançados',
        icon: 'bolt',
        highlights: [
            'Suporte ortogonal a Biset, Triset, Giant Set, Dropset, Rest-Pause, Cluster, Myo-Reps, FST-7 e BFR.',
            'Modos de execução biomecânica (Cadência E-P-C-P, Ponto Zero, Isometria, Parciais) e Guia Pedagógico ("?").',
            'Templates de séries completos preservando todas as 4 camadas e parâmetros de Cardio/HIIT.'
        ]
    },
    {
        version: 'v2.1.0',
        date: 'Set 2026',
        title: 'Sincronização Offline PWA & Galeria de Evolução',
        icon: 'cloud_done',
        highlights: [
            'Cache resiliente de treinos e fila de sincronização offline automática para academias sem sinal.',
            'Cronômetro blindado em segundo plano com reconciliação exata por timestamp.',
            'Galeria de Fotos de Evolução com limpeza sincronizada no Supabase Storage.'
        ]
    }
];

const Updates: React.FC = () => {
    const { user } = useAuth();
    const [expiringStudents, setExpiringStudents] = useState<any[]>([]);
    const [noRoutineStudents, setNoRoutineStudents] = useState<any[]>([]);
    const [pendingStudents, setPendingStudents] = useState<any[]>([]);
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
                const status = s.profiles?.status;
                if (status !== 'active') return false;
                if (!s.consultancy_expires_at) return false;

                const exp = new Date(s.consultancy_expires_at);
                return exp <= fiveDaysFromNow;
            }) || [];

            setExpiringStudents(expiringOrExpired);

            // 2. Fetch Active Students without Active Routine
            const activeStudentIds = studentsData?.filter((s: any) => s.profiles?.status === 'active').map((s: any) => s.id) || [];

            if (activeStudentIds.length > 0) {
                const { data: assignments, error: assignmentsError } = await supabase
                    .from('student_assignments')
                    .select('student_id')
                    .eq('is_active', true)
                    .in('student_id', activeStudentIds);

                if (assignmentsError) throw assignmentsError;

                const withRoutine = new Set(assignments?.map((a: any) => a.student_id));
                const withoutRoutine = studentsData?.filter((s: any) =>
                    s.profiles?.status === 'active' && !withRoutine.has(s.id)
                ) || [];

                setNoRoutineStudents(withoutRoutine);
            } else {
                setNoRoutineStudents([]);
            }

            // 3. Fetch Pending Approvals
            const pending = studentsData?.filter((s: any) => s.profiles?.status === 'pending') || [];
            setPendingStudents(pending);

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
                <Link
                    to="/coach/dashboard"
                    aria-label="Voltar para a dashboard"
                    className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-700 hover:text-sky-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                    <span className="material-symbols-rounded" aria-hidden="true">arrow_back</span>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">Atualizações</h1>
                    <p className="text-slate-600 dark:text-slate-300 text-sm">Pendências operacionais e novidades do sistema</p>
                </div>
            </header>

            <div className="px-5 space-y-8">
                {/* Section: Pending Approvals */}
                {pendingStudents.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-rounded text-blue-500" aria-hidden="true">person_add</span>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Aprovações Pendentes</h2>
                        </div>

                        <div className="space-y-3">
                            {pendingStudents.map(student => (
                                <div key={student.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-soft border border-slate-100 dark:border-slate-700 flex items-center justify-between animate-pulse-slow">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={student.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.profiles?.full_name || 'Aluno')}&background=random`}
                                            alt={`Avatar de ${student.profiles?.full_name || 'Aluno'}`}
                                            loading="lazy"
                                            width="40"
                                            height="40"
                                            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 object-cover"
                                        />
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">{student.profiles?.full_name || 'Usuário'}</h3>
                                            <p className="text-xs text-blue-500 font-bold uppercase tracking-wider">Novo Cadastro</p>
                                        </div>
                                    </div>
                                    <Link
                                        to="/coach/students"
                                        aria-label={`Ver detalhes do aluno ${student.profiles?.full_name || 'Aluno'}`}
                                        className="px-4 py-2 min-h-[44px] bg-blue-500 text-white text-xs font-bold rounded-xl hover:bg-blue-600 shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                                    >
                                        Ver Aluno
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Section: Expiring Plans */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-rounded text-amber-500" aria-hidden="true">warning</span>
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
                            <p className="text-sm text-slate-600 dark:text-slate-300 italic">Nenhum plano vencendo esta semana.</p>
                        ) : (
                            expiringStudents.map(student => {
                                const days = getDaysRemaining(student.consultancy_expires_at);
                                const isExpired = days < 0;

                                return (
                                    <div key={student.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-soft border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={student.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.profiles?.full_name || 'Aluno')}&background=random`}
                                                alt={`Avatar de ${student.profiles?.full_name || 'Aluno'}`}
                                                loading="lazy"
                                                width="40"
                                                height="40"
                                                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 object-cover"
                                            />
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-white text-sm">{student.profiles?.full_name || 'Usuário'}</h3>
                                                <p className={`text-xs font-bold tabular-nums ${isExpired ? 'text-red-500' : 'text-amber-600 dark:text-amber-400'}`}>
                                                    {isExpired ? 'VENCIDO' : `Vence em ${days} dias`}
                                                </p>
                                            </div>
                                        </div>
                                        <Link
                                            to="/coach/students"
                                            aria-label={`Renovar plano de ${student.profiles?.full_name || 'Aluno'}`}
                                            className="px-4 py-2 min-h-[44px] bg-primary/10 text-primary text-xs font-bold rounded-xl hover:bg-primary/20 transition-colors flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                        <span className="material-symbols-rounded text-red-500" aria-hidden="true">assignment_late</span>
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
                            <p className="text-sm text-slate-600 dark:text-slate-300 italic">Todos os alunos ativos possuem treinos.</p>
                        ) : (
                            noRoutineStudents.map(student => (
                                <div key={student.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-soft border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={student.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.profiles?.full_name || 'Aluno')}&background=random`}
                                            alt={`Avatar de ${student.profiles?.full_name || 'Aluno'}`}
                                            loading="lazy"
                                            width="40"
                                            height="40"
                                            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 object-cover"
                                        />
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">{student.profiles?.full_name || 'Usuário'}</h3>
                                            <p className="text-xs text-red-600 dark:text-red-400 font-medium">Sem rotina atribuída</p>
                                        </div>
                                    </div>
                                    <Link
                                        to="/coach/library"
                                        aria-label={`Atribuir rotina para ${student.profiles?.full_name || 'Aluno'}`}
                                        className="px-4 py-2 min-h-[44px] bg-primary/10 text-primary text-xs font-bold rounded-xl hover:bg-primary/20 transition-colors flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    >
                                        Atribuir
                                    </Link>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Section: System Changelog / Novidades da Plataforma */}
                <section className="pt-2">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-rounded text-primary" aria-hidden="true">new_releases</span>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Novidades da Plataforma</h2>
                    </div>

                    <div className="space-y-4">
                        {SYSTEM_RELEASES.map((release) => (
                            <article
                                key={release.version}
                                className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 space-y-3"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                            <span className="material-symbols-rounded text-lg" aria-hidden="true">{release.icon}</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-snug">{release.title}</h3>
                                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider tabular-nums">{release.date}</span>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300 text-[10px] font-black uppercase tracking-wider tabular-nums">
                                        {release.version}
                                    </span>
                                </div>
                                <ul className="space-y-1.5 pl-1">
                                    {release.highlights.map((item, idx) => (
                                        <li key={idx} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" aria-hidden="true" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </MainLayout>
    );
};

export default Updates;
