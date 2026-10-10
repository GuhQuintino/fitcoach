import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../components/Layout/MainLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { matchesSearch } from '../../utils/textUtils';
import { formatToWhatsappUrl } from '../../utils/phoneUtils';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import {
    classifyStudent,
    calculateDashboardStats,
    formatLastWorkout,
    formatPlanExpiration,
    getStatusBadgeConfig,
    StudentClassification
} from '../../utils/studentStatus';

interface StudentProfile {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    status: string | null;
    phone: string | null;
}

interface StudentItem {
    id: string;
    consultancy_expires_at: string | null;
    profiles: StudentProfile | null;
}

type TabType = 'active' | 'pending' | 'inactive' | 'all';
type SortOption = 'recent' | 'name';

const CoachStudents: React.FC = () => {
    const { user } = useAuth();
    const [allStudents, setAllStudents] = useState<StudentItem[]>([]);
    const [lastWorkouts, setLastWorkouts] = useState<Map<string, string>>(new Map());
    const [loading, setLoading] = useState(true);

    // Tab inicial padrão é 'active' (Regra S2)
    const [selectedTab, setSelectedTab] = useState<TabType>('active');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('recent');

    // Estado do Modal de Aprovação / Ajuste de Data
    const [modalStudent, setModalStudent] = useState<StudentItem | null>(null);
    const [expirationDate, setExpirationDate] = useState<string>('');
    const [modalLoading, setModalLoading] = useState(false);
    const [actionFeedback, setActionFeedback] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            loadStudentsData();
        }
    }, [user]);

    // Limpa feedback após 3 segundos
    useEffect(() => {
        if (!actionFeedback) return;
        const timer = setTimeout(() => setActionFeedback(null), 3000);
        return () => clearTimeout(timer);
    }, [actionFeedback]);

    /**
     * Carregamento em lote otimizado:
     * 1. Busca todos os alunos do treinador
     * 2. Faz uma única query em lote para o último treino finalizado de todos os alunos (Anti-N+1)
     */
    const loadStudentsData = async () => {
        try {
            setLoading(true);

            // 1. Carrega todos os alunos do coach com os dados de perfil
            const { data: studentsData, error: studentsError } = await supabase
                .from('students_data')
                .select(`
                    id,
                    consultancy_expires_at,
                    profiles!students_data_id_fkey!inner (
                        id,
                        full_name,
                        avatar_url,
                        status,
                        phone
                    )
                `)
                .eq('coach_id', user!.id);

            if (studentsError) throw studentsError;

            const fetchedStudents: StudentItem[] = (studentsData as any) || [];
            setAllStudents(fetchedStudents);

            const studentIds = fetchedStudents.map(s => s.id);

            // 2. Query em lote para buscar o último treino de cada aluno (Anti-N+1)
            if (studentIds.length > 0) {
                const { data: logsData, error: logsError } = await supabase
                    .from('workout_logs')
                    .select('student_id, finished_at')
                    .in('student_id', studentIds)
                    .not('finished_at', 'is', null)
                    .order('finished_at', { ascending: false });

                if (!logsError && logsData) {
                    const workoutMap = new Map<string, string>();
                    for (const log of logsData) {
                        if (log.student_id && log.finished_at && !workoutMap.has(log.student_id)) {
                            workoutMap.set(log.student_id, log.finished_at);
                        }
                    }
                    setLastWorkouts(workoutMap);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar lista de alunos:', error);
        } finally {
            setLoading(false);
        }
    };

    // Estatísticas globais fixas (não flutuam ao trocar de aba ou pesquisar - Regra S3)
    const globalStats = useMemo(() => {
        return calculateDashboardStats(allStudents);
    }, [allStudents]);

    // Filtragem e ordenação instantâneas no cliente
    const filteredStudents = useMemo(() => {
        const now = new Date();

        let result = allStudents.filter(student => {
            // Filtro por Aba
            if (selectedTab !== 'all') {
                const classification = classifyStudent(student, now);
                if (classification !== selectedTab) {
                    return false;
                }
            }

            // Filtro por Busca Instantânea
            if (searchTerm.trim()) {
                const fullName = student.profiles?.full_name || '';
                if (!matchesSearch(fullName, searchTerm)) {
                    return false;
                }
            }

            return true;
        });

        // Ordenação
        result.sort((a, b) => {
            if (sortBy === 'recent') {
                const logA = lastWorkouts.get(a.id);
                const logB = lastWorkouts.get(b.id);

                if (logA && logB) {
                    const diff = new Date(logB).getTime() - new Date(logA).getTime();
                    if (diff !== 0) return diff;
                } else if (logA && !logB) {
                    return -1;
                } else if (!logA && logB) {
                    return 1;
                }

                // Desempate por ordem alfabética A-Z
                const nameA = a.profiles?.full_name || '';
                const nameB = b.profiles?.full_name || '';
                return nameA.localeCompare(nameB, 'pt-BR');
            } else {
                // Nome A-Z
                const nameA = a.profiles?.full_name || '';
                const nameB = b.profiles?.full_name || '';
                return nameA.localeCompare(nameB, 'pt-BR');
            }
        });

        return result;
    }, [allStudents, selectedTab, searchTerm, sortBy, lastWorkouts]);

    // Abre o modal de aprovação ou alteração de data de vencimento
    const handleOpenModal = (student: StudentItem) => {
        setModalStudent(student);

        if (student.consultancy_expires_at) {
            // Preenche com a data atual cadastrada
            const existingDate = new Date(student.consultancy_expires_at);
            if (!isNaN(existingDate.getTime())) {
                setExpirationDate(existingDate.toISOString().split('T')[0]);
                return;
            }
        }

        // Padrão de +30 dias
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 30);
        setExpirationDate(defaultDate.toISOString().split('T')[0]);
    };

    // Aplica atalho rápido de dias no modal (+30, +60, +90, +365)
    const handleApplyQuickDays = (days: number) => {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);
        setExpirationDate(targetDate.toISOString().split('T')[0]);
    };

    // Confirma aprovação de novo aluno ou atualização de data
    const handleConfirmModal = async () => {
        if (!modalStudent || !expirationDate) return;

        try {
            setModalLoading(true);

            // Ajusta para o final do dia escolhido em UTC
            const finalIsoDate = new Date(`${expirationDate}T23:59:59Z`).toISOString();
            const isPendingApproval = modalStudent.profiles?.status === 'pending';

            if (isPendingApproval) {
                // Chama a RPC approve_student
                const { data, error } = await supabase.rpc('approve_student', {
                    student_uuid: modalStudent.id,
                    expiration_date: finalIsoDate
                });

                if (error) throw error;
                if (data && !data.success) {
                    throw new Error(data.error || 'Falha ao aprovar aluno');
                }

                // Atualização otimista local
                setAllStudents(prev => prev.map(s => {
                    if (s.id === modalStudent.id) {
                        return {
                            ...s,
                            consultancy_expires_at: finalIsoDate,
                            profiles: s.profiles ? {
                                ...s.profiles,
                                status: 'active'
                            } : {
                                id: s.id,
                                full_name: 'Aluno',
                                avatar_url: null,
                                status: 'active',
                                phone: null
                            }
                        };
                    }
                    return s;
                }));

                setActionFeedback(`Aluno ${modalStudent.profiles?.full_name || ''} aprovado com sucesso!`);
            } else {
                // Atualiza a data de expiração diretamente em students_data
                const { error: updateError } = await supabase
                    .from('students_data')
                    .update({ consultancy_expires_at: finalIsoDate })
                    .eq('id', modalStudent.id);

                if (updateError) throw updateError;

                // Atualização otimista local
                setAllStudents(prev => prev.map(s => {
                    if (s.id === modalStudent.id) {
                        return {
                            ...s,
                            consultancy_expires_at: finalIsoDate
                        };
                    }
                    return s;
                }));

                setActionFeedback('Validade do plano atualizada com sucesso!');
            }

            setModalStudent(null);
        } catch (error: any) {
            console.error('Erro ao salvar vencimento do aluno:', error);
            alert(error.message || 'Falha ao salvar as alterações do aluno.');
        } finally {
            setModalLoading(false);
        }
    };

    return (
        <MainLayout>
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                <div className="absolute top-0 right-0 w-80 h-80 bg-sky-400/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-40 left-0 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl"></div>
            </div>

            {/* Cabeçalho da Página */}
            <header className="relative px-5 pt-8 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">Meus Alunos</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Gerencie quem treina com você</p>
                    </div>
                    <Link
                        to="/coach/invite"
                        aria-label="Convidar novo aluno"
                        className="bg-primary text-white p-3 rounded-2xl shadow-lg shadow-primary/25 active:scale-95 transition-transform flex items-center justify-center"
                        title="Convidar Aluno"
                    >
                        <span className="material-symbols-rounded text-2xl" aria-hidden="true">person_add</span>
                    </Link>
                </div>

                {/* Feedback Toast */}
                {actionFeedback && (
                    <div
                        role="status"
                        aria-live="polite"
                        className="mt-4 p-3 bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg flex items-center gap-2 animate-fade-in"
                    >
                        <span className="material-symbols-rounded text-base" aria-hidden="true">check_circle</span>
                        <span>{actionFeedback}</span>
                    </div>
                )}
            </header>

            <div className="relative px-5 space-y-5 pb-32">
                {/* 1. Cards Globais de Estatísticas (Fixos - Regra S3) */}
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                    <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700/60">
                        <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white block">{globalStats.totalStudents}</span>
                        <span className="text-[10px] sm:text-xs text-slate-500 uppercase font-semibold">Total</span>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700/60">
                        <span className="text-xl sm:text-2xl font-bold text-emerald-500 block">{globalStats.activeStudents}</span>
                        <span className="text-[10px] sm:text-xs text-slate-500 uppercase font-semibold">Ativos</span>
                    </div>

                    <div className={`p-3 sm:p-4 rounded-2xl shadow-soft border transition-all ${
                        globalStats.pendingStudents > 0
                            ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/20'
                            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/60'
                    }`}>
                        <span className={`text-xl sm:text-2xl font-bold block ${globalStats.pendingStudents > 0 ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                            {globalStats.pendingStudents}
                        </span>
                        <span className={`text-[10px] sm:text-xs uppercase font-semibold ${globalStats.pendingStudents > 0 ? 'text-amber-100' : 'text-slate-500'}`}>
                            Pendentes
                        </span>
                    </div>

                    <div className={`p-3 sm:p-4 rounded-2xl shadow-soft border ${
                        globalStats.inactiveStudents > 0
                            ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30'
                            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/60'
                    }`}>
                        <span className={`text-xl sm:text-2xl font-bold block ${globalStats.inactiveStudents > 0 ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'}`}>
                            {globalStats.inactiveStudents}
                        </span>
                        <span className={`text-[10px] sm:text-xs uppercase font-semibold ${globalStats.inactiveStudents > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-500'}`}>
                            Inativos
                        </span>
                    </div>
                </div>

                {/* 2. Campo de Busca Instantânea */}
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-rounded text-slate-400" aria-hidden="true">search</span>
                    <input
                        type="text"
                        placeholder="Buscar aluno pelo nome..."
                        aria-label="Buscar aluno pelo nome"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-3.5 pl-12 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-soft placeholder:text-slate-400 text-slate-900 dark:text-white"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            aria-label="Limpar busca"
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                            <span className="material-symbols-rounded text-base" aria-hidden="true">close</span>
                        </button>
                    )}
                </div>

                {/* 3. Abas com Contadores Dinâmicos */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1" role="tablist" aria-label="Filtro de alunos">
                    {[
                        { id: 'active', label: 'Ativos', count: globalStats.activeStudents },
                        { id: 'pending', label: 'Pendentes', count: globalStats.pendingStudents },
                        { id: 'inactive', label: 'Inativos', count: globalStats.inactiveStudents },
                        { id: 'all', label: 'Todos', count: globalStats.totalStudents }
                    ].map(tab => {
                        const isSelected = selectedTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={isSelected}
                                onClick={() => setSelectedTab(tab.id as TabType)}
                                className={`whitespace-nowrap px-4 py-2 min-h-[44px] flex items-center justify-center rounded-full text-sm font-bold transition-all cursor-pointer ${
                                    isSelected
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                                        : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className={`ml-1.5 px-2 py-0.5 text-xs rounded-full font-semibold ${
                                    isSelected
                                        ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* 4. Barra de Ordenação e Quantidade de Resultados */}
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 pt-1">
                    <span>
                        Mostrando <strong className="text-slate-900 dark:text-white font-semibold">{filteredStudents.length}</strong> {filteredStudents.length === 1 ? 'aluno' : 'alunos'}
                    </span>
                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700/60 shadow-xs">
                        <span className="material-symbols-rounded text-base text-slate-400" aria-hidden="true">swap_vert</span>
                        <label htmlFor="student-sort-select" className="sr-only">Ordenar alunos por</label>
                        <select
                            id="student-sort-select"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="bg-transparent font-medium text-slate-700 dark:text-slate-200 border-none focus:outline-none cursor-pointer text-xs"
                        >
                            <option value="recent" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Último treino</option>
                            <option value="name" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Nome (A-Z)</option>
                        </select>
                    </div>
                </div>

                {/* 5. Lista de Cards dos Alunos */}
                <div className="space-y-3">
                    {loading ? (
                        <div className="text-center py-16" role="status" aria-live="polite">
                            <div className="w-9 h-9 rounded-full border-3 border-primary border-t-transparent animate-spin mx-auto mb-3"></div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Carregando alunos e treinos...</p>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="text-center py-14 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 p-6">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700/60 mx-auto mb-3 flex items-center justify-center text-slate-400">
                                <span className="material-symbols-rounded text-3xl" aria-hidden="true">group_off</span>
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-base">Nenhum aluno encontrado</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-xs mx-auto">
                                {searchTerm
                                    ? `Nenhum resultado para "${searchTerm}" nesta aba.`
                                    : 'Não há alunos nesta categoria no momento.'}
                            </p>
                        </div>
                    ) : (
                        filteredStudents.map((student) => {
                            const classification: StudentClassification = classifyStudent(student);
                            const badgeConfig = getStatusBadgeConfig(classification);
                            const isPendingApproval = student.profiles?.status === 'pending';
                            const whatsappUrl = formatToWhatsappUrl(student.profiles?.phone);

                            const lastWorkoutLog = lastWorkouts.get(student.id);
                            const lastWorkout = formatLastWorkout(lastWorkoutLog);
                            const planExpiration = formatPlanExpiration(student.consultancy_expires_at);

                            const studentName = student.profiles?.full_name || 'Aluno s/ nome';

                            return (
                                <div
                                    key={student.id}
                                    className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center gap-4 transition-all hover:border-slate-200 dark:hover:border-slate-600"
                                >
                                    {/* Informações Principais do Aluno */}
                                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                                        <div className="relative flex-shrink-0">
                                            {student.profiles?.avatar_url ? (
                                                <img
                                                    src={getOptimizedImageUrl(student.profiles.avatar_url, 96, 96)}
                                                    alt={`Avatar de ${studentName}`}
                                                    loading="lazy"
                                                    width="48"
                                                    height="48"
                                                    className="w-12 h-12 rounded-full object-cover bg-slate-100 dark:bg-slate-700 ring-2 ring-slate-100 dark:ring-slate-700"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-sm ring-2 ring-slate-100 dark:ring-slate-700">
                                                    {studentName.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <span
                                                className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800 ${badgeConfig.dotClass}`}
                                                aria-hidden="true"
                                            />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">
                                                    {studentName}
                                                </h3>
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeConfig.bgClass} ${badgeConfig.textClass}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${badgeConfig.dotClass}`}></span>
                                                    {badgeConfig.label}
                                                </span>
                                            </div>

                                            {/* Badges de Atividade e Vencimento */}
                                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                                {/* Badge de Último Treino */}
                                                <div
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                                                        lastWorkout.badgeVariant === 'emerald'
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/40 dark:border-emerald-800/30'
                                                            : lastWorkout.badgeVariant === 'amber'
                                                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-semibold border border-amber-200/50 dark:border-amber-800/40'
                                                            : lastWorkout.badgeVariant === 'slate'
                                                            ? 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'
                                                            : 'bg-slate-50 dark:bg-slate-800 text-slate-400'
                                                    }`}
                                                    title={lastWorkout.label}
                                                >
                                                    <span className="material-symbols-rounded text-sm" aria-hidden="true">fitness_center</span>
                                                    <span>{lastWorkout.label}</span>
                                                </div>

                                                {/* Badge de Vencimento do Plano */}
                                                <div
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                                                        planExpiration.urgency === 'urgent'
                                                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-bold border border-rose-200/50 dark:border-rose-800/40'
                                                            : planExpiration.urgency === 'grace'
                                                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-semibold border border-amber-200/50 dark:border-amber-800/40'
                                                            : planExpiration.urgency === 'warning'
                                                            ? 'bg-amber-50/70 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200/30 dark:border-amber-800/30'
                                                            : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                                    }`}
                                                    title={planExpiration.text}
                                                >
                                                    <span className="material-symbols-rounded text-sm" aria-hidden="true">calendar_today</span>
                                                    <span>{planExpiration.text}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ações Rápidas do Card (Regra S6) */}
                                    <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700/60">
                                        {/* Botão de WhatsApp (disponível para todos os alunos com telefone) */}
                                        {whatsappUrl && (
                                            <a
                                                href={whatsappUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                aria-label={`Conversar no WhatsApp com ${studentName}`}
                                                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                                                title="Falar no WhatsApp"
                                            >
                                                <span className="material-symbols-rounded text-xl" aria-hidden="true">chat</span>
                                            </a>
                                        )}

                                        {/* Botão de Ajuste de Vencimento do Plano */}
                                        <button
                                            type="button"
                                            onClick={() => handleOpenModal(student)}
                                            aria-label={`Editar vencimento do plano de ${studentName}`}
                                            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                                            title="Editar vencimento do plano"
                                        >
                                            <span className="material-symbols-rounded text-xl" aria-hidden="true">edit_calendar</span>
                                        </button>

                                        {/* Botão de Aprovação (para alunos com cadastro pendente) */}
                                        {isPendingApproval && (
                                            <button
                                                type="button"
                                                onClick={() => handleOpenModal(student)}
                                                aria-label={`Aprovar cadastro de ${studentName}`}
                                                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/25 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                                title="Aprovar aluno"
                                            >
                                                <span className="material-symbols-rounded text-xl" aria-hidden="true">check</span>
                                            </button>
                                        )}

                                        {/* Botão de Ver Perfil / Treinos */}
                                        <Link
                                            to={`/coach/student/${student.id}`}
                                            aria-label={`Ver perfil e treinos de ${studentName}`}
                                            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                            title="Abrir perfil"
                                        >
                                            <span className="material-symbols-rounded text-xl" aria-hidden="true">arrow_forward</span>
                                        </Link>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Modal de Aprovação / Ajuste de Vencimento */}
            {modalStudent && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="student-modal-title"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
                >
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-slate-100 dark:border-slate-700">
                        <div className="text-center mb-5">
                            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 mx-auto mb-3 flex items-center justify-center overflow-hidden ring-4 ring-slate-100 dark:ring-slate-700">
                                {modalStudent.profiles?.avatar_url ? (
                                    <img
                                        src={getOptimizedImageUrl(modalStudent.profiles.avatar_url, 128, 128)}
                                        alt={`Avatar de ${modalStudent.profiles?.full_name || 'Aluno'}`}
                                        loading="lazy"
                                        width="64"
                                        height="64"
                                        className="w-full h-full rounded-full object-cover"
                                    />
                                ) : (
                                    <span className="text-xl font-bold text-slate-500 dark:text-slate-400">
                                        {(modalStudent.profiles?.full_name || 'A').charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <h2 id="student-modal-title" className="text-xl font-bold text-slate-900 dark:text-white font-display">
                                {modalStudent.profiles?.status === 'pending' ? 'Aprovar Aluno' : 'Vencimento do Plano'}
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                                {modalStudent.profiles?.status === 'pending'
                                    ? 'Defina a validade da consultoria para liberar o acesso de:'
                                    : 'Ajuste a data de expiração da consultoria de:'}
                                <br />
                                <strong className="text-slate-900 dark:text-white font-semibold">
                                    {modalStudent.profiles?.full_name || 'Aluno'}
                                </strong>
                            </p>
                        </div>

                        {/* Atalhos Rápidos de Validade */}
                        <div className="mb-4">
                            <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                Atalhos de validade
                            </span>
                            <div className="grid grid-cols-4 gap-1.5">
                                {[
                                    { label: '+30d', days: 30 },
                                    { label: '+60d', days: 60 },
                                    { label: '+90d', days: 90 },
                                    { label: '+1 ano', days: 365 }
                                ].map(shortcut => (
                                    <button
                                        key={shortcut.days}
                                        type="button"
                                        onClick={() => handleApplyQuickDays(shortcut.days)}
                                        className="py-1.5 px-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                                    >
                                        {shortcut.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Input de Data */}
                        <div className="mb-6">
                            <label htmlFor="student-expiration-input" className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                                Data de Vencimento
                            </label>
                            <input
                                id="student-expiration-input"
                                type="date"
                                value={expirationDate}
                                onChange={(e) => setExpirationDate(e.target.value)}
                                className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 text-center">
                                O acesso aos treinos permanece ativo até esta data.
                            </p>
                        </div>

                        {/* Botões do Modal */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setModalStudent(null)}
                                disabled={modalLoading}
                                aria-label="Cancelar alteração"
                                className="flex-1 min-h-[44px] py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmModal}
                                disabled={modalLoading || !expirationDate}
                                aria-label="Confirmar alteração"
                                className="flex-1 min-h-[44px] bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/25 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {modalLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" role="status" aria-label="Salvando..."></div>
                                        <span>Salvando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-rounded text-lg" aria-hidden="true">check</span>
                                        <span>{modalStudent.profiles?.status === 'pending' ? 'Aprovar' : 'Salvar'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};

export default CoachStudents;