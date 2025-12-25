import React, { useEffect, useState } from 'react';
import MainLayout from '../../components/Layout/MainLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { matchesSearch } from '../../utils/textUtils';

const CoachStudents: React.FC = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState<'all' | 'active' | 'pending' | 'inactive'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Approval Modal State
    const [approvingStudent, setApprovingStudent] = useState<any | null>(null);
    const [expirationDate, setExpirationDate] = useState<string>('');
    const [approvalLoading, setApprovalLoading] = useState(false);

    useEffect(() => {
        if (user) {
            fetchStudents();
        }
    }, [user, selectedTab]);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            let query = supabase
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

            // Filter by Tab
            if (selectedTab === 'active') {
                query = query.eq('profiles.status', 'active').gt('consultancy_expires_at', new Date().toISOString());
            } else if (selectedTab === 'pending') {
                query = query.eq('profiles.status', 'pending');
            } else if (selectedTab === 'inactive') {
                // Inactive = status 'rejected'/'banned' OR (status 'active' AND expired)
                query = query.or(`status.eq.rejected,status.eq.banned,and(status.eq.active,consultancy_expires_at.lt.${new Date().toISOString()})`, { foreignTable: 'profiles' as any });
            }

            query = query.order('full_name', { foreignTable: 'profiles' });
            const { data, error } = await query;
            if (error) throw error;

            let filteredData = data || [];

            // Client-side Search (Accent Insensitive)
            if (searchTerm.trim()) {
                filteredData = filteredData.filter(s =>
                    matchesSearch(s.profiles?.full_name || '', searchTerm)
                );
            }

            setStudents(filteredData);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (user) fetchStudents();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleOpenApproval = (student: any) => {
        setApprovingStudent(student);
        // Default to +30 days
        const nextMonth = new Date();
        nextMonth.setDate(nextMonth.getDate() + 30);
        setExpirationDate(nextMonth.toISOString().split('T')[0]);
    };

    const handleConfirmApproval = async () => {
        if (!approvingStudent || !expirationDate) return;

        try {
            setApprovalLoading(true);

            // Call RPC Function
            const { data, error } = await supabase.rpc('approve_student', {
                student_uuid: approvingStudent.id,
                expiration_date: new Date(expirationDate).toISOString()
            });

            if (error) throw error;

            // Close Modal & UI Update
            setApprovingStudent(null);

            // Optimistic Update
            setStudents(prev => prev.map(s => {
                if (s.id === approvingStudent.id) {
                    return {
                        ...s,
                        consultancy_expires_at: expirationDate ? new Date(expirationDate).toISOString() : s.consultancy_expires_at,
                        // Hotfix applied to prevent status of null error
                        profiles: s.profiles ? {
                            ...s.profiles,
                            status: 'active'
                        } : { status: 'active' }
                    };
                }
                return s;
            }));

        } catch (error) {
            console.error('Error approving student:', error);
            alert('Falha ao aprovar aluno. Verifique as permissões.');
        } finally {
            setApprovalLoading(false);
        }
    };

    // Helper to determine status based on Expiration Date
    const getStudentState = (student: any) => {
        const status = student.profiles?.status;
        const expiresAt = student.consultancy_expires_at;

        if (!status || status === 'pending') return 'pending';

        // Active but might be expired
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

    const activeCount = students.filter(s => getStudentState(s) === 'active').length;
    const pendingCount = students.filter(s => getStudentState(s) === 'pending').length;
    const inactiveCount = students.filter(s => {
        const state = getStudentState(s);
        return state === 'inactive' || state === 'expired';
    }).length;

    const formatDaysRemaining = (dateString: string | null) => {
        if (!dateString) return 'Sem plano ativo';
        const now = new Date();
        const exp = new Date(dateString);
        const diffTime = exp.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'Vencido';
        if (diffDays === 0) return 'Vence hoje';
        return `Vence em ${diffDays} dias`;
    };

    return (
        <MainLayout>
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-72 h-72 bg-sky-400/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-40 left-0 w-56 h-56 bg-indigo-400/10 rounded-full blur-3xl"></div>
            </div>

            <header className="relative px-5 py-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display mb-1">Meus Alunos</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Gerencie quem treina com você</p>
            </header>

            <main className="relative px-5 space-y-6 pb-32">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-soft">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white block">{students.length}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Total</span>
                    </div>

                    {pendingCount > 0 ? (
                        <div className="bg-amber-500 p-4 rounded-2xl shadow-lg shadow-amber-500/30 text-white animate-pulse">
                            <span className="text-2xl font-bold block">{pendingCount}</span>
                            <span className="text-[10px] uppercase font-semibold text-amber-100">Pendentes</span>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-soft">
                            <span className="text-2xl font-bold text-emerald-500 block">{activeCount}</span>
                            <span className="text-[10px] text-slate-500 uppercase font-semibold">Ativos</span>
                        </div>
                    )}

                    <div className={`p-4 rounded-2xl shadow-soft ${inactiveCount > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-white dark:bg-slate-800'}`}>
                        <span className={`text-2xl font-bold block ${inactiveCount > 0 ? 'text-red-500' : 'text-slate-400'}`}>{inactiveCount}</span>
                        <span className={`text-[10px] uppercase font-semibold ${inactiveCount > 0 ? 'text-red-400' : 'text-slate-500'}`}>Inativos</span>
                    </div>
                </div>

                {/* Actions & Search */}
                <div className="space-y-4">
                    <Link to="/coach/invite" className="w-full bg-sky-500 text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-lg shadow-sky-500/25 active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
                        <span className="material-symbols-rounded">person_add</span>
                        Convidar Aluno
                    </Link>

                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-rounded text-slate-400">search</span>
                        <input
                            type="text"
                            placeholder="Buscar aluno pelo nome..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-soft placeholder:text-slate-400 dark:text-white"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    {[
                        { id: 'all', label: 'Todos' },
                        { id: 'active', label: 'Ativos' },
                        { id: 'pending', label: 'Pendentes' },
                        { id: 'inactive', label: 'Inativos' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setSelectedTab(tab.id as any)}
                            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors ${selectedTab === tab.id
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                            <p className="text-slate-400 text-sm">Carregando...</p>
                        </div>
                    ) : students.length === 0 ? (
                        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                            <span className="material-symbols-rounded text-4xl text-slate-300 mb-2">group_off</span>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhum aluno nesta lista.</p>
                        </div>
                    ) : (
                        students.map((student) => {
                            const state = getStudentState(student);
                            const isPending = state === 'pending';
                            const whatsappLink = student.profiles?.phone
                                ? `https://wa.me/${student.profiles?.phone?.replace(/\D/g, '')}`
                                : null;

                            return (
                                <div key={student.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                                    <img
                                        src={student.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${student.profiles?.full_name || 'Aluno'}&background=random`}
                                        alt={student.profiles?.full_name}
                                        className="w-12 h-12 rounded-full object-cover bg-slate-100"
                                    />

                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-900 dark:text-white truncate">{student.profiles?.full_name || 'Usuário s/ nome'}</h3>
                                        <div className="flex flex-col mt-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${state === 'active' ? 'bg-emerald-500' :
                                                    state === 'pending' ? 'bg-amber-500' : 'bg-red-500'
                                                    }`}></span>
                                                <span className="text-xs text-slate-500 capitalize">{
                                                    state === 'active' ? 'Ativo' :
                                                        state === 'pending' ? 'Pendente' :
                                                            state === 'expired' ? 'Vencido' : 'Inativo'
                                                }</span>
                                            </div>
                                            {!isPending && (
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs mt-1 ${state === 'expired' ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                                                        {formatDaysRemaining(student.consultancy_expires_at)}
                                                    </span>
                                                    <button
                                                        onClick={() => handleOpenApproval(student)}
                                                        className="mt-1 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary transition-colors"
                                                    >
                                                        <span className="material-symbols-rounded text-xs">edit_calendar</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions for Pending Students */}
                                    {isPending && (
                                        <div className="flex items-center gap-2">
                                            {whatsappLink && (
                                                <a href={whatsappLink} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-emerald-600 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors">
                                                    <span className="material-symbols-rounded">chat</span>
                                                </a>
                                            )}
                                            <button
                                                onClick={() => handleOpenApproval(student)}
                                                className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 hover:scale-105 active:scale-95 transition-transform"
                                                title="Aprovar Aluno"
                                            >
                                                <span className="material-symbols-rounded">check</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* For Active/Inactive Students (Link to Profile) */}
                                    {!isPending && (
                                        <Link to={`/coach/student/${student.id}`} className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                            <span className="material-symbols-rounded">arrow_forward</span>
                                        </Link>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </main>

            {/* Approval Modal */}
            {approvingStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-scale-up">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 mx-auto mb-4 flex items-center justify-center">
                                <img
                                    src={approvingStudent.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${approvingStudent.profiles?.full_name || 'Aluno'}`}
                                    alt=""
                                    className="w-full h-full rounded-full object-cover"
                                />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Aprovar Aluno</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                Defina a validade do plano para <br />
                                <strong className="text-slate-800 dark:text-slate-200">{approvingStudent.profiles?.full_name || 'Aluno'}</strong>
                            </p>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Vencimento do Plano</label>
                                <input
                                    type="date"
                                    value={expirationDate}
                                    onChange={(e) => setExpirationDate(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                                <p className="text-xs text-slate-400 mt-2 text-center">
                                    O acesso será bloqueado após esta data.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setApprovingStudent(null)}
                                className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmApproval}
                                disabled={approvalLoading}
                                className="flex-1 bg-sky-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-sky-500/25 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {approvalLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span className="material-symbols-rounded">check_circle</span>
                                        Confirmar
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