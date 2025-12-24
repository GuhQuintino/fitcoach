import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import ThemeToggle from '../../components/ThemeToggle';

interface CoachProfile {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    status: 'active' | 'pending' | 'rejected' | 'banned';
    created_at: string;
    coaches_data: any;
}

interface PlatformStats {
    totalCoaches: number;
    activeCoaches: number;
    pendingCoaches: number;
    totalStudents: number;
    activeStudents: number;
    recentWorkouts: number;
}

const AdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const [coaches, setCoaches] = useState<CoachProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'active'>('pending');
    const [stats, setStats] = useState<PlatformStats>({
        totalCoaches: 0,
        activeCoaches: 0,
        pendingCoaches: 0,
        totalStudents: 0,
        activeStudents: 0,
        recentWorkouts: 0
    });

    const [editingCoach, setEditingCoach] = useState<CoachProfile | null>(null);
    const [newExpirationDate, setNewExpirationDate] = useState<string>('');
    const [updateLoading, setUpdateLoading] = useState(false);

    // Greeting based on time
    const currentHour = new Date().getHours();
    let greeting = 'Bom dia';
    if (currentHour >= 12 && currentHour < 18) greeting = 'Boa tarde';
    else if (currentHour >= 18) greeting = 'Boa noite';

    const adminName = user?.user_metadata?.full_name?.split(' ')[0] || 'Admin';

    useEffect(() => {
        fetchStats();
        fetchCoaches();
    }, [filter]);

    const fetchStats = async () => {
        try {
            // Coaches count
            const { count: totalCoaches } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'coach');

            const { count: activeCoaches } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'coach')
                .eq('status', 'active');

            const { count: pendingCoaches } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'coach')
                .eq('status', 'pending');

            // Students count
            const { count: totalStudents } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'student');

            const { count: activeStudents } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'student')
                .eq('status', 'active');

            // Recent workouts (last 7 days)
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const { count: recentWorkouts } = await supabase
                .from('workout_logs')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', weekAgo.toISOString());

            setStats({
                totalCoaches: totalCoaches || 0,
                activeCoaches: activeCoaches || 0,
                pendingCoaches: pendingCoaches || 0,
                totalStudents: totalStudents || 0,
                activeStudents: activeStudents || 0,
                recentWorkouts: recentWorkouts || 0
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchCoaches = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('profiles')
                .select(`
                    id, 
                    full_name, 
                    email, 
                    phone,
                    avatar_url, 
                    status, 
                    created_at,
                    coaches_data (cref, bio, phone, subscription_expires_at)
                `)
                .eq('role', 'coach');

            if (filter !== 'all') {
                query = query.eq('status', filter);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            setCoaches(data as any || []);
        } catch (error: any) {
            toast.error('Erro ao carregar treinadores');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (coach: CoachProfile, newStatus: 'active' | 'rejected' | 'banned') => {
        try {
            const cData = Array.isArray(coach.coaches_data) ? coach.coaches_data[0] : coach.coaches_data;
            if (newStatus === 'active' && !cData?.subscription_expires_at) {
                openExpirationModal(coach);
                return;
            }

            const { error } = await supabase
                .from('profiles')
                .update({ status: newStatus })
                .eq('id', coach.id);

            if (error) throw error;

            toast.success(`Treinador ${newStatus === 'active' ? 'aprovado' : 'atualizado'} com sucesso`);
            fetchCoaches();
            fetchStats();
        } catch (error: any) {
            toast.error('Erro ao atualizar status');
        }
    };

    const openExpirationModal = (coach: CoachProfile) => {
        setEditingCoach(coach);
        const cData = Array.isArray(coach.coaches_data) ? coach.coaches_data[0] : coach.coaches_data;
        const currentExp = cData?.subscription_expires_at;
        if (currentExp) {
            setNewExpirationDate(new Date(currentExp).toISOString().split('T')[0]);
        } else {
            const defaultDate = new Date();
            defaultDate.setDate(defaultDate.getDate() + 30);
            setNewExpirationDate(defaultDate.toISOString().split('T')[0]);
        }
    };

    const handleSaveExpiration = async () => {
        if (!editingCoach || !newExpirationDate) return;

        setUpdateLoading(true);
        try {
            if (editingCoach.status !== 'active') {
                const { error: statusError } = await supabase
                    .from('profiles')
                    .update({ status: 'active' })
                    .eq('id', editingCoach.id);

                if (statusError) throw statusError;
            }

            const { error: upsertError } = await supabase
                .from('coaches_data')
                .upsert({
                    id: editingCoach.id,
                    subscription_expires_at: new Date(newExpirationDate).toISOString()
                }, { onConflict: 'id' });

            if (upsertError) throw upsertError;

            toast.success('Assinatura atualizada com sucesso');
            setEditingCoach(null);
            fetchCoaches();
            fetchStats();
        } catch (error: any) {
            toast.error(`Erro ao atualizar assinatura: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setUpdateLoading(false);
        }
    };

    const formatDaysRemaining = (dateString: string | null) => {
        if (!dateString) return { text: 'Sem validade', color: 'text-slate-400', urgent: false };
        const now = new Date();
        const exp = new Date(dateString);
        const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { text: 'Expirado', color: 'text-red-500', urgent: true };
        if (diffDays === 0) return { text: 'Vence hoje!', color: 'text-amber-500', urgent: true };
        if (diffDays <= 7) return { text: `${diffDays}d restantes`, color: 'text-amber-500', urgent: true };
        return { text: `${diffDays}d restantes`, color: 'text-emerald-500', urgent: false };
    };

    const StatCard = ({ icon, label, value, color, subValue }: { icon: string; label: string; value: number; color: string; subValue?: string }) => (
        <div className="group relative bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl p-6 border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 overflow-hidden">
            <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full ${color} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`}></div>
            <div className="relative z-10 flex items-start justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">{label}</p>
                    <p className="text-4xl font-black text-slate-900 dark:text-white font-display">{value}</p>
                    {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
                </div>
                <div className={`p-3 rounded-2xl ${color} bg-opacity-10 dark:bg-opacity-20`}>
                    <span className={`material-symbols-rounded text-2xl ${color}`}>{icon}</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl"></div>
            </div>

            <div className="relative max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <a
                            href="#/coach/dashboard"
                            className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-sky-500 hover:border-sky-300 dark:hover:border-sky-700 transition-all shadow-sm hover:shadow-md active:scale-95"
                        >
                            <span className="material-symbols-rounded text-xl">arrow_back</span>
                        </a>
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25">
                            <span className="material-symbols-rounded text-2xl text-white">shield_person</span>
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{greeting}, {adminName}</p>
                            <h1 className="text-2xl font-display font-black text-slate-900 dark:text-white">
                                Painel Administrativo
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Sistema Online</span>
                        </div>
                    </div>
                </header>

                {/* Stats Grid */}
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    <StatCard icon="school" label="Total Coaches" value={stats.totalCoaches} color="text-sky-500" subValue={`${stats.activeCoaches} ativos`} />
                    <StatCard icon="pending" label="Pendentes" value={stats.pendingCoaches} color="text-amber-500" />
                    <StatCard icon="groups" label="Total Alunos" value={stats.totalStudents} color="text-indigo-500" subValue={`${stats.activeStudents} ativos`} />
                    <StatCard icon="fitness_center" label="Treinos (7d)" value={stats.recentWorkouts} color="text-emerald-500" />
                </section>

                {/* Coaches Management */}
                <section>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
                            <span className="material-symbols-rounded text-sky-500">manage_accounts</span>
                            Gestão de Treinadores
                        </h2>

                        <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                            {(['pending', 'active', 'all'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-5 py-2 text-xs font-bold rounded-xl transition-all uppercase tracking-widest ${filter === f
                                        ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
                                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    {f === 'pending' ? 'Pendentes' : f === 'active' ? 'Ativos' : 'Todos'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-3xl animate-pulse h-72 border border-slate-100 dark:border-slate-700"></div>
                            ))}
                        </div>
                    ) : coaches.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                            <span className="material-symbols-rounded text-6xl text-slate-300 dark:text-slate-600 mb-4">person_search</span>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhum treinador encontrado nesta categoria.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {coaches.map((coach) => {
                                const cData = Array.isArray(coach.coaches_data) ? coach.coaches_data[0] : coach.coaches_data;
                                const expiresAt = cData?.subscription_expires_at;
                                const expInfo = formatDaysRemaining(expiresAt);

                                return (
                                    <div
                                        key={coach.id}
                                        className={`group relative bg-white dark:bg-slate-800/80 backdrop-blur-sm border rounded-3xl p-6 shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden ${expInfo.urgent ? 'border-amber-200 dark:border-amber-800/50' : 'border-slate-100 dark:border-slate-700/50'
                                            }`}
                                    >
                                        {/* Urgent Indicator */}
                                        {expInfo.urgent && (
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-red-400 animate-pulse"></div>
                                        )}

                                        {/* Status Badge */}
                                        <div className="absolute top-4 right-4">
                                            <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${coach.status === 'pending' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                                coach.status === 'active' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                    'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                                }`}>
                                                {coach.status}
                                            </span>
                                        </div>

                                        {/* Profile */}
                                        <div className="flex items-center gap-4 mb-5 pt-2">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-xl font-bold text-sky-500 border border-slate-200 dark:border-slate-600 overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                                                {coach.avatar_url ? (
                                                    <img src={coach.avatar_url} alt={coach.full_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    coach.full_name.charAt(0)
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-slate-900 dark:text-white truncate">{coach.full_name}</h3>
                                                <p className="text-xs text-slate-500 truncate">{coach.email}</p>
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="space-y-2.5 mb-5">
                                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                                <span className="material-symbols-rounded text-base text-sky-500">badge</span>
                                                <span className="font-medium">CREF: {cData?.cref || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                                <span className="material-symbols-rounded text-base text-sky-500">call</span>
                                                <span className="font-medium">{coach.phone || cData?.phone || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className={`material-symbols-rounded text-base ${expInfo.color}`}>calendar_today</span>
                                                    <span className={`font-bold ${expInfo.color}`}>{expInfo.text}</span>
                                                </div>
                                                {coach.status === 'active' && (
                                                    <button
                                                        onClick={() => openExpirationModal(coach)}
                                                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/30 transition-all"
                                                    >
                                                        <span className="material-symbols-rounded text-sm">edit</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                            {coach.status === 'pending' ? (
                                                <>
                                                    <button
                                                        onClick={() => handleStatusUpdate(coach, 'active')}
                                                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-3 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
                                                    >
                                                        <span className="material-symbols-rounded text-base">check_circle</span>
                                                        Aprovar
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusUpdate(coach, 'rejected')}
                                                        className="bg-slate-100 hover:bg-red-50 dark:bg-slate-700 dark:hover:bg-red-900/30 text-slate-600 dark:text-slate-400 dark:hover:text-red-400 text-xs font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
                                                    >
                                                        <span className="material-symbols-rounded text-base">cancel</span>
                                                        Rejeitar
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => handleStatusUpdate(coach, coach.status === 'active' ? 'banned' : 'active')}
                                                    className={`col-span-2 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${coach.status === 'active'
                                                        ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400'
                                                        : 'bg-emerald-500 text-white hover:bg-emerald-600'
                                                        }`}
                                                >
                                                    <span className="material-symbols-rounded text-base">
                                                        {coach.status === 'active' ? 'block' : 'check_circle'}
                                                    </span>
                                                    {coach.status === 'active' ? 'Bloquear Acesso' : 'Ativar Acesso'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            {/* Modal */}
            {editingCoach && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-scale-up border border-white/20 dark:border-slate-700">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sky-500/25">
                                <span className="material-symbols-rounded text-3xl">event</span>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Definir Validade</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                {editingCoach.full_name}
                            </p>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Data de Expiração</label>
                                <input
                                    type="date"
                                    value={newExpirationDate}
                                    onChange={(e) => setNewExpirationDate(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all cursor-pointer"
                                />
                                <p className="text-[10px] text-slate-400 mt-2 text-center">
                                    O coach terá +1 dia de carência após esta data.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setEditingCoach(null)}
                                className="flex-1 py-4 rounded-xl font-bold text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveExpiration}
                                disabled={updateLoading || !newExpirationDate}
                                className="flex-1 bg-gradient-to-r from-sky-500 to-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-sky-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {updateLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
                                ) : (
                                    'Confirmar'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
