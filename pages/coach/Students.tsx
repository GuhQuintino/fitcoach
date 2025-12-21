import React, { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';

type StudentStatus = 'active' | 'pending' | 'inactive';

interface StudentProfile {
    id: string;
    full_name: string;
    avatar_url: string | null;
    status: string;
    phone: string | null;
    students_data: {
        consultancy_expires_at: string | null;
    }[];
}

const Students: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<StudentProfile[]>([]);
    const [activeTab, setActiveTab] = useState<StudentStatus | 'all'>('all');
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, pending: 0 });

    useEffect(() => {
        if (user) {
            fetchStudents();
        }
    }, [user]);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            // Fetch profiles linked to this coach via students_data
            const { data, error } = await supabase
                .from('students_data')
                .select(`
                    id,
                    profiles:id (
                        id, full_name, avatar_url, status, phone
                    ),
                    consultancy_expires_at
                `)
                .eq('coach_id', user!.id);

            if (error) throw error;

            const formattedStudents = data.map((item: any) => ({
                ...item.profiles,
                students_data: [{ consultancy_expires_at: item.consultancy_expires_at }]
            }));

            setStudents(formattedStudents);
            calculateStats(formattedStudents);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data: StudentProfile[]) => {
        const active = data.filter(s => s.status === 'active').length;
        const inactive = data.filter(s => s.status === 'inactive' || s.status === 'banned').length;
        const pending = data.filter(s => s.status === 'pending').length;
        setStats({ total: data.length, active, inactive, pending });
    };

    const handleApprove = async (studentId: string) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ status: 'active' })
                .eq('id', studentId);

            if (error) throw error;

            // Update local state
            const updatedStudents = students.map(s =>
                s.id === studentId ? { ...s, status: 'active' } : s
            );
            setStudents(updatedStudents);
            calculateStats(updatedStudents);
        } catch (error) {
            console.error('Error approving student:', error);
            alert('Erro ao aprovar aluno.');
        }
    };

    const filteredStudents = students.filter(student => {
        if (activeTab === 'all') return true;
        if (activeTab === 'inactive' && (student.status === 'rejected' || student.status === 'banned')) return true;
        return student.status === activeTab;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-500';
            case 'pending': return 'bg-amber-500';
            case 'inactive': return 'bg-slate-400';
            default: return 'bg-red-500';
        }
    };

    const formatDaysRemaining = (dateString: string | null) => {
        if (!dateString) return 'Sem plano ativo';
        const days = Math.ceil((new Date(dateString).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        if (days < 0) return 'Vencido';
        return `Vence em ${days} dias`;
    };

    return (
        <MainLayout className="pb-24">
            <header className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-10 px-4 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <Link to="/coach/dashboard" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <span className="material-symbols-rounded text-slate-600 dark:text-slate-300">arrow_back</span>
                    </Link>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Seus Alunos</h1>
                </div>
                <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <span className="material-symbols-rounded text-slate-600 dark:text-slate-300">search</span>
                </button>
            </header>

            <main className="flex-1 px-4 py-6 overflow-y-auto">
                {/* Stats Card */}
                <div className="bg-primary rounded-xl p-5 mb-6 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white opacity-10 rounded-full translate-x-8 -translate-y-8 blur-2xl pointer-events-none"></div>
                    <div className="relative z-10">
                        <p className="text-blue-100 text-sm font-medium mb-1">Total de Alunos</p>
                        <div className="flex items-end gap-2">
                            <h2 className="text-3xl font-bold">{stats.total}</h2>
                            {stats.pending > 0 && (
                                <span className="mb-1 text-sm bg-amber-400 text-amber-900 px-2 py-0.5 rounded font-bold animate-pulse">
                                    {stats.pending} Pendentes
                                </span>
                            )}
                        </div>
                        <div className="flex gap-4 mt-4">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                <span className="text-sm font-medium">{stats.active} Ativos</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-slate-300 rounded-full"></span>
                                <span className="text-sm font-medium">{stats.inactive} Inativos</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <Link to="/coach/invite" className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-soft flex flex-col items-center justify-center gap-2 border border-slate-100 dark:border-slate-700 active:scale-95 transition-transform">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-primary">
                            <span className="material-symbols-rounded">person_add</span>
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Adicionar</span>
                    </Link>
                    <Link to="/coach/invite" className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-soft flex flex-col items-center justify-center gap-2 border border-slate-100 dark:border-slate-700 active:scale-95 transition-transform">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400">
                            <span className="material-symbols-rounded">link</span>
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Link</span>
                    </Link>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                    {[
                        { id: 'all', label: 'Todos' },
                        { id: 'active', label: 'Ativos' },
                        { id: 'pending', label: 'Pendentes' },
                        { id: 'inactive', label: 'Inativos' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="space-y-3">
                    {loading ? (
                        <div className="text-center py-10 text-slate-400">Carregando...</div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-slate-500">Nenhum aluno encontrado.</p>
                        </div>
                    ) : (
                        filteredStudents.map(student => (
                            <div key={student.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-soft border border-slate-100 dark:border-slate-700 transition-all">
                                <Link to={`/coach/student/${student.id}`} className="flex items-center gap-4 mb-3">
                                    <div className="relative">
                                        {student.avatar_url ? (
                                            <img alt="Avatar" className="w-12 h-12 rounded-full object-cover" src={student.avatar_url} />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400 font-bold text-lg">
                                                {student.full_name?.charAt(0) || '?'}
                                            </div>
                                        )}
                                        <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-slate-800 rounded-full ${getStatusColor(student.status)}`}></span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">{student.full_name}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                                            {student.status === 'pending' ? 'Solicitado hoje' : formatDaysRemaining(student.students_data[0]?.consultancy_expires_at)}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="material-symbols-rounded text-slate-300 text-xl">chevron_right</span>
                                    </div>
                                </Link>

                                {student.status === 'pending' && (
                                    <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                        {student.phone && (
                                            <a
                                                href={`https://wa.me/${student.phone.replace(/\D/g, '')}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex-1 py-2 rounded-lg bg-[#25D366]/10 text-[#25D366] font-bold text-sm flex items-center justify-center gap-1 hover:bg-[#25D366]/20 transition-colors"
                                            >
                                                <span className="material-symbols-rounded text-lg">chat</span>
                                                WhatsApp
                                            </a>
                                        )}
                                        <button
                                            onClick={() => handleApprove(student.id)}
                                            className="flex-1 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary-dark transition-colors shadow-sm"
                                        >
                                            Aprovar
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </main>
        </MainLayout>
    );
};

export default Students;