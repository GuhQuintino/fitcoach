import React, { useEffect, useState } from 'react';
import MainLayout from '../../components/Layout/MainLayout';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import EvolutionGallery from '../../components/student/EvolutionGallery';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const StudentProfileView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [profile, setProfile] = useState<any>(null);
    const [studentData, setStudentData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeRoutine, setActiveRoutine] = useState<any>(null);
    const [workouts, setWorkouts] = useState<any[]>([]);

    // Expiration Modal
    const [isEditingExpiration, setIsEditingExpiration] = useState(false);
    const [newExpirationDate, setNewExpirationDate] = useState('');
    const [savingExpiration, setSavingExpiration] = useState(false);

    // Progress Data
    const [weightHistory, setWeightHistory] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [assignmentId, setAssignmentId] = useState<string | null>(null);

    // Edit Routine Modal
    const [isEditingRoutineModal, setIsEditingRoutineModal] = useState(false);
    const [routineName, setRoutineName] = useState('');
    const [savingRoutine, setSavingRoutine] = useState(false);

    // Edit Workout Modal
    const [editingWorkoutItem, setEditingWorkoutItem] = useState<any | null>(null);
    const [workoutName, setWorkoutName] = useState('');
    const [savingWorkout, setSavingWorkout] = useState(false);

    useEffect(() => {
        if (id) {
            fetchStudentDetails();
            fetchWeightHistory();
            fetchLogs();
        }
    }, [id]);

    const fetchWeightHistory = async () => {
        try {
            const { data } = await supabase
                .from('weight_history')
                .select('*')
                .eq('student_id', id!)
                .order('recorded_at', { ascending: true });
            setWeightHistory(data || []);
        } catch (error) {
            console.error('Error fetching weight history:', error);
        }
    };

    const fetchLogs = async () => {
        try {
            const { data, error } = await supabase
                .from('workout_logs')
                .select(`
                    *,
                    workout:workouts (name),
                    set_logs (
                        *,
                        exercise:exercises (name)
                    )
                `)
                .eq('student_id', id!)
                .order('started_at', { ascending: false });
            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
        }
    };

    const fetchStudentDetails = async () => {
        try {
            setLoading(true);
            const { data: pData, error: pError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id!)
                .single();
            if (pError) throw pError;
            setProfile(pData);

            const { data: sData, error: sError } = await supabase
                .from('students_data')
                .select('*')
                .eq('id', id!)
                .single();
            if (sError) throw sError;
            setStudentData(sData);

            if (sData?.consultancy_expires_at) {
                setNewExpirationDate(sData.consultancy_expires_at.split('T')[0]);
            }

            // Fetch Active Routine
            const { data: assignment, error: aError } = await supabase
                .from('student_assignments')
                .select('*, routines(*)')
                .eq('student_id', id!)
                .eq('is_active', true)
                .maybeSingle();

            if (assignment?.routines) {
                setAssignmentId(assignment.id);
                setActiveRoutine(assignment.routines);
                setRoutineName(assignment.routines.name);
                const { data: wData } = await supabase
                    .from('workouts')
                    .select('*')
                    .eq('routine_id', assignment.routines.id)
                    .order('day_number', { ascending: true });
                setWorkouts(wData || []);
            } else {
                setActiveRoutine(null);
                setWorkouts([]);
            }
        } catch (error) {
            console.error('Error fetching details:', error);
            toast.error('Erro ao carregar detalhes do aluno.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateExpiration = async () => {
        try {
            setSavingExpiration(true);
            const { error } = await supabase.rpc('approve_student', {
                student_uuid: id,
                expiration_date: new Date(newExpirationDate).toISOString()
            });

            if (error) throw error;

            setStudentData({ ...studentData, consultancy_expires_at: new Date(newExpirationDate).toISOString() });
            setIsEditingExpiration(false);
            toast.success('Validade atualizada com sucesso!');
        } catch (error) {
            console.error('Error updating expiration:', error);
            toast.error('Erro ao atualizar validade.');
        } finally {
            setSavingExpiration(false);
        }
    };

    const handleUpdateRoutineName = async () => {
        if (!activeRoutine || !routineName.trim()) return;
        try {
            setSavingRoutine(true);
            const { error } = await supabase
                .from('routines')
                .update({ name: routineName })
                .eq('id', activeRoutine.id);

            if (error) throw error;

            setActiveRoutine({ ...activeRoutine, name: routineName });
            setIsEditingRoutineModal(false);
            toast.success('Nome da rotina atualizado!');
        } catch (error) {
            console.error('Error updating routine:', error);
            toast.error('Erro ao atualizar nome da rotina.');
        } finally {
            setSavingRoutine(false);
        }
    };

    const handleUnassignRoutine = async () => {
        if (!assignmentId || !window.confirm('Tem certeza que deseja remover esta rotina do aluno?')) return;
        try {
            setLoading(true);
            const { error } = await supabase
                .from('student_assignments')
                .update({ is_active: false })
                .eq('id', assignmentId);

            if (error) throw error;

            setActiveRoutine(null);
            setWorkouts([]);
            setAssignmentId(null);
            toast.success('Rotina removida com sucesso!');
        } catch (error) {
            console.error('Error unassigning routine:', error);
            toast.error('Erro ao remover rotina.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateWorkoutName = async () => {
        if (!editingWorkoutItem || !workoutName.trim()) return;
        try {
            setSavingWorkout(true);
            const { error } = await supabase
                .from('workouts')
                .update({ name: workoutName })
                .eq('id', editingWorkoutItem.id);

            if (error) throw error;

            setWorkouts(prev => prev.map(w => w.id === editingWorkoutItem.id ? { ...w, name: workoutName } : w));
            setEditingWorkoutItem(null);
            toast.success('Nome do treino atualizado!');
        } catch (error) {
            console.error('Error updating workout:', error);
            toast.error('Erro ao atualizar nome do treino.');
        } finally {
            setSavingWorkout(false);
        }
    };

    const handleReorderWorkout = async (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= workouts.length) return;

        const newWorkouts = [...workouts];
        const [moved] = newWorkouts.splice(index, 1);
        newWorkouts.splice(newIndex, 0, moved);

        // Optimistic update
        setWorkouts(newWorkouts);

        try {
            // Update day_number for all to ensure order
            const updates = newWorkouts.map((w, idx) => ({
                id: w.id,
                day_number: idx + 1
            }));

            for (const update of updates) {
                await supabase.from('workouts')
                    .update({
                        day_number: update.day_number,
                        order_index: update.day_number // Manter ambos sincronizados
                    })
                    .eq('id', update.id);
            }
        } catch (error) {
            console.error('Error reordering workouts:', error);
            toast.error('Erro ao salvar nova ordem.');
            fetchStudentDetails(); // Rollback
        }
    };

    const formatAge = (birthDate: string) => {
        if (!birthDate) return '--';
        const ageDifMs = Date.now() - new Date(birthDate).getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    const calculateTMB = () => {
        if (!studentData?.weight_kg || !studentData?.height_cm || !studentData?.birth_date) return 0;
        const w = studentData.weight_kg;
        const h = studentData.height_cm;
        const birth = new Date(studentData.birth_date);
        const age = Math.abs(new Date(Date.now() - birth.getTime()).getUTCFullYear() - 1970);
        const gender = studentData.gender || 'male';

        if (gender === 'male') {
            return Math.round((10 * w) + (6.25 * h) - (5 * age) + 5);
        } else {
            return Math.round((10 * w) + (6.25 * h) - (5 * age) - 161);
        }
    };

    const getWeeklyVolumeData = () => {
        if (!logs.length) return [];
        const weeks: { [key: string]: number } = {};

        // Use a consistent week numbering
        const getWeekKey = (date: Date) => {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() + 4 - (d.getDay() || 7));
            const yearStart = new Date(d.getFullYear(), 0, 1);
            const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
            return `${d.getFullYear()}-W${weekNo}`;
        };

        // Initialize last 5 weeks
        for (let i = 4; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - (i * 7));
            const weekKey = getWeekKey(d);
            weeks[weekKey] = 0;
        }

        logs.forEach(log => {
            const weekKey = getWeekKey(new Date(log.started_at));
            if (weeks[weekKey] !== undefined) {
                let vol = 0;
                log.set_logs?.forEach((s: any) => {
                    vol += (parseFloat(s.weight_kg) || 0) * (parseInt(s.reps_completed) || 0);
                });
                weeks[weekKey] += vol;
            }
        });

        return Object.entries(weeks).map(([key, value], idx) => ({
            name: idx === 4 ? 'Atual' : `Sem ${idx + 1}`,
            volume: value
        }));
    };

    const tmb = calculateTMB();
    const maintenance = Math.round(tmb * 1.35);
    const weeklyData = getWeeklyVolumeData();

    if (loading) return (
        <MainLayout>
            <div className="flex-1 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        </MainLayout>
    );

    const isExpired = studentData?.consultancy_expires_at && new Date(studentData.consultancy_expires_at) < new Date();

    return (
        <MainLayout>
            <div className="min-h-full pb-8">
                <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-white/5">
                    <Link to="/coach/students" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <span className="material-symbols-rounded text-slate-700 dark:text-slate-200">arrow_back_ios_new</span>
                    </Link>
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white">Perfil do Aluno</h1>
                    <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors opacity-0 pointer-events-none">
                        <span className="material-symbols-rounded">edit</span>
                    </button>
                </header>

                <section className="flex flex-col items-center pt-8 pb-4 px-4">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-tr from-primary to-emerald-400 rounded-full blur opacity-50 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative w-32 h-32 rounded-full p-1 bg-white dark:bg-slate-900">
                            <img
                                src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name}&background=random`}
                                alt={profile?.full_name}
                                className="w-full h-full rounded-full object-cover"
                            />
                        </div>
                    </div>
                    <div className="mt-4 text-center">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display">{profile?.full_name}</h2>
                        <div className="flex flex-col items-center gap-2 mt-2">
                            {isExpired ? (
                                <button
                                    onClick={() => setIsEditingExpiration(true)}
                                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider hover:bg-red-200 transition-colors border border-red-200 dark:border-red-800"
                                >
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    Plano Vencido (Editar)
                                </button>
                            ) : (
                                <button
                                    onClick={() => setIsEditingExpiration(true)}
                                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider hover:bg-emerald-200 transition-colors border border-emerald-200 dark:border-emerald-800"
                                >
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Ativo até {new Date(studentData?.consultancy_expires_at).toLocaleDateString()}
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                <section className="px-6 py-4">
                    {profile?.phone && (
                        <a
                            className="flex items-center justify-center w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold h-12 rounded-xl gap-2 transition-all active:scale-[0.98] shadow-lg shadow-green-500/20"
                            href={`https://wa.me/${profile.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <span className="material-symbols-rounded text-[24px]">chat</span>
                            <span>Mensagem via WhatsApp</span>
                        </a>
                    )}
                </section>

                <section className="px-4 sm:px-6 py-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-900 dark:text-white text-lg font-bold flex items-center gap-2">
                            <span className="material-symbols-rounded text-primary">fitness_center</span>
                            Treino Atual
                        </h3>
                        {activeRoutine && (
                            <button
                                onClick={handleUnassignRoutine}
                                className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1"
                            >
                                <span className="material-symbols-rounded text-[16px]">delete</span>
                                Remover Rotina
                            </button>
                        )}
                    </div>

                    {activeRoutine ? (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Rotina Ativa</p>
                                    <h4 className="font-bold text-slate-900 dark:text-white">{activeRoutine.name}</h4>
                                </div>
                                <button
                                    onClick={() => {
                                        setRoutineName(activeRoutine.name);
                                        setIsEditingRoutineModal(true);
                                    }}
                                    className="p-2 text-slate-400 hover:text-primary transition-colors"
                                >
                                    <span className="material-symbols-rounded text-xl">edit</span>
                                </button>
                            </div>
                            <div className="p-4 space-y-4">
                                {workouts.length > 0 ? (
                                    workouts.map((w, idx) => (
                                        <div key={w.id} className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 flex flex-col gap-4 shadow-sm">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-black ring-1 ring-primary/20">
                                                        {String.fromCharCode(65 + idx)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{w.name}</h4>
                                                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">Treino Individual</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 p-0.5">
                                                        <button
                                                            onClick={() => handleReorderWorkout(idx, 'up')}
                                                            disabled={idx === 0}
                                                            className="p-1.5 text-slate-400 hover:text-primary disabled:opacity-20 transition-colors"
                                                            title="Mover para cima"
                                                        >
                                                            <span className="material-symbols-rounded text-base">keyboard_arrow_up</span>
                                                        </button>
                                                        <div className="w-[1px] h-4 bg-slate-100 dark:bg-slate-700 mx-0.5" />
                                                        <button
                                                            onClick={() => handleReorderWorkout(idx, 'down')}
                                                            disabled={idx === workouts.length - 1}
                                                            className="p-1.5 text-slate-400 hover:text-primary disabled:opacity-20 transition-colors"
                                                            title="Mover para baixo"
                                                        >
                                                            <span className="material-symbols-rounded text-base">keyboard_arrow_down</span>
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setEditingWorkoutItem(w);
                                                            setWorkoutName(w.name);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-primary transition-colors flex items-center justify-center"
                                                        title="Renomear"
                                                    >
                                                        <span className="material-symbols-rounded text-lg">edit</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <Link
                                                to={`/coach/editor?workout_id=${w.id}&student_id=${id}`}
                                                className="w-full bg-white dark:bg-slate-800 text-primary border border-primary/20 hover:border-primary/40 font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm text-sm"
                                            >
                                                <span className="material-symbols-rounded text-[20px]">edit_note</span>
                                                MONTAR TREINO {String.fromCharCode(65 + idx)}
                                            </Link>
                                        </div>
                                    ))
                                ) : (
                                    <p className="p-4 text-sm text-slate-500 text-center italic">Nenhum treino nesta rotina.</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center">
                            <p className="text-slate-500 text-sm mb-4">Nenhuma rotina atribuída.</p>
                            <Link to="/coach/library" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors">
                                <span className="material-symbols-rounded text-[18px]">add</span>
                                Atribuir da Biblioteca
                            </Link>
                        </div>
                    )}
                </section>

                <section className="px-4 sm:px-6 py-2">
                    <h3 className="text-slate-900 dark:text-white text-lg font-bold mb-4 flex items-center gap-2">
                        <span className="material-symbols-rounded text-primary">photo_library</span>
                        Evolução (Fotos)
                    </h3>
                    <EvolutionGallery studentId={id} isCoachView={true} />
                </section>

                {/* Workout History Section */}
                <section className="px-4 sm:px-6 py-4">
                    <button
                        onClick={() => setShowHistoryModal(true)}
                        className="w-full bg-white dark:bg-slate-800 rounded-[2.5rem] p-4 sm:p-6 shadow-soft border border-slate-100 dark:border-slate-700 flex items-center justify-between group hover:border-primary/30 transition-all overflow-hidden relative"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <span className="material-symbols-rounded text-6xl">history</span>
                        </div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                <span className="material-symbols-rounded">history</span>
                            </div>
                            <div className="text-left">
                                <h3 className="text-slate-900 dark:text-white font-bold">Histórico de Treinos</h3>
                                <p className="text-xs text-slate-500">{logs.length} treinos realizados</p>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors relative z-10">
                            <span className="material-symbols-rounded">arrow_forward</span>
                        </div>
                    </button>
                </section>

                <section className="px-4 sm:px-6 py-2 space-y-6">
                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Weight Evolution Chart */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-soft border border-slate-100 dark:border-slate-700 animate-slide-up">
                            <div className="flex items-center gap-2 mb-6">
                                <span className="material-symbols-rounded text-sky-500">monitoring</span>
                                <h3 className="font-bold text-slate-900 dark:text-white">Evolução de Peso</h3>
                            </div>
                            <div className="h-44 w-full">
                                {weightHistory.length > 1 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={weightHistory.map(h => ({
                                            weight: h.weight_kg,
                                            date: new Date(h.recorded_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                                        }))}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="date" hide />
                                            <YAxis hide domain={['auto', 'auto']} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                                formatter={(val: number) => [`${val} kg`, 'Peso']}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="weight"
                                                stroke="#0ea5e9"
                                                strokeWidth={4}
                                                dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }}
                                                activeDot={{ r: 6, fill: '#0ea5e9', strokeWidth: 0 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                        <span className="material-symbols-rounded text-4xl opacity-20">show_chart</span>
                                        <p className="text-xs font-medium">Histórico insuficiente</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Volume Evolution Chart */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-soft border border-slate-100 dark:border-slate-700 animate-slide-up">
                            <div className="flex items-center gap-2 mb-6">
                                <span className="material-symbols-rounded text-indigo-500">bar_chart</span>
                                <h3 className="font-bold text-slate-900 dark:text-white">Volume Semanal</h3>
                            </div>
                            <div className="h-44 w-full">
                                {weeklyData.some(d => d.volume > 0) ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={weeklyData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                                            />
                                            <YAxis hide />
                                            <Tooltip
                                                cursor={{ fill: 'transparent' }}
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                                formatter={(val: number) => [`${Math.round(val).toLocaleString()} kg`, 'Volume']}
                                            />
                                            <Bar dataKey="volume" radius={[6, 6, 6, 6]} barSize={32}>
                                                {weeklyData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index === 4 ? '#3b82f6' : '#bfdbfe'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                                        <span className="material-symbols-rounded text-3xl">bar_chart</span>
                                        <p className="text-[10px] uppercase font-bold tracking-widest">Sem dados de volume</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Metabolic Grid */}
                    {tmb > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gradient-to-br from-orange-500 to-rose-600 p-5 rounded-[2rem] text-white shadow-lg shadow-orange-500/20">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Gasto Basal</p>
                                <p className="text-2xl font-black">{tmb} <span className="text-xs font-bold opacity-80">kcal</span></p>
                            </div>
                            <div className="bg-emerald-500 p-5 rounded-[2rem] text-white shadow-lg shadow-emerald-500/20">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Manutenção</p>
                                <p className="text-2xl font-black">~{maintenance} <span className="text-xs font-bold opacity-80">kcal</span></p>
                            </div>
                        </div>
                    )}

                    {/* Personal Info Grid */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col items-center justify-center gap-1 rounded-2xl p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Idade</span>
                            <p className="text-slate-900 dark:text-white font-bold">{formatAge(studentData?.birth_date)} anos</p>
                        </div>
                        <div className="flex flex-col items-center justify-center gap-1 rounded-2xl p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Altura</span>
                            <p className="text-slate-900 dark:text-white font-bold">{studentData?.height_cm || '--'} cm</p>
                        </div>
                        <div className="flex flex-col items-center justify-center gap-1 rounded-2xl p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sexo</span>
                            <p className="text-slate-900 dark:text-white font-bold">
                                {studentData?.gender === 'female' ? 'Fem' : 'Masc'}
                            </p>
                        </div>
                    </div>

                    <div className="bg-sky-50 dark:bg-sky-900/10 p-5 rounded-3xl border border-sky-100 dark:border-sky-500/10">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="material-symbols-rounded text-sky-500">flag</span>
                            <h4 className="text-xs font-bold text-sky-800 dark:text-sky-300 uppercase tracking-widest">Objetivo Principal</h4>
                        </div>
                        <p className="text-slate-700 dark:text-slate-200 font-medium">
                            {studentData?.goal || 'Não definido pelo aluno.'}
                        </p>
                    </div>
                </section>

                {/* Edit Expiration Modal */}
                {isEditingExpiration && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/50 backdrop-blur-md animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-scale-up border border-slate-100 dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 text-center">Alterar Validade</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-6">
                                Defina uma nova data de vencimento para o plano deste aluno.
                            </p>

                            <input
                                type="date"
                                value={newExpirationDate}
                                onChange={(e) => setNewExpirationDate(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 mb-6"
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsEditingExpiration(false)}
                                    className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleUpdateExpiration}
                                    disabled={savingExpiration}
                                    className="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/25 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {savingExpiration ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* History Modal */}
            {
                showHistoryModal && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-slate-50 dark:bg-slate-900 w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-500 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-slate-50 dark:bg-slate-900 z-10">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Histórico de Treinos</h2>
                                    <p className="text-xs text-slate-500 uppercase font-black tracking-widest mt-1">{profile?.full_name}</p>
                                </div>
                                <button
                                    onClick={() => setShowHistoryModal(false)}
                                    className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all"
                                >
                                    <span className="material-symbols-rounded">close</span>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {logs.length > 0 ? (
                                    logs.map((log) => (
                                        <div key={log.id} className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-soft border border-slate-100 dark:border-slate-700 flex flex-col gap-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-primary/5 dark:bg-primary/10 flex flex-col items-center justify-center text-primary">
                                                        <span className="text-[9px] font-black uppercase leading-none">{new Date(log.started_at).toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                                                        <span className="text-lg font-black leading-tight">{new Date(log.started_at).getDate()}</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 dark:text-white text-base line-clamp-1">{log.workout?.name || 'Treino s/ nome'}</h4>
                                                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                            <span className="flex items-center gap-1">
                                                                <span className="material-symbols-rounded text-sm">schedule</span>
                                                                {Math.floor((new Date(log.finished_at).getTime() - new Date(log.started_at).getTime()) / 60000)} min
                                                            </span>
                                                            <span className="flex items-center gap-1 text-primary">
                                                                <span className="material-symbols-rounded text-sm">bolt</span>
                                                                {log.effort_rating || 0}/10 Esforço
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {log.feedback_notes && (
                                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl text-xs text-slate-600 dark:text-slate-300 italic border border-slate-100/50 dark:border-slate-800/50 leading-relaxed">
                                                    "{log.feedback_notes}"
                                                </div>
                                            )}

                                            {/* Set Summary */}
                                            {log.set_logs && log.set_logs.length > 0 && (
                                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Média de Carga</span>
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                            {(log.set_logs.reduce((acc: number, s: any) => acc + (s.weight_kg || 0), 0) / log.set_logs.length).toFixed(1)} kg
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total de Séries</span>
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{log.set_logs.length} séries</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-12 text-center">
                                        <span className="material-symbols-rounded text-4xl text-slate-200 mb-2">history</span>
                                        <p className="text-sm text-slate-400 italic">Nenhum treino realizado ainda.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Edit Routine Name Modal */}
            {
                isEditingRoutineModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-scale-up border border-slate-100 dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Editar Nome da Rotina</h2>
                            <input
                                type="text"
                                value={routineName}
                                onChange={(e) => setRoutineName(e.target.value)}
                                placeholder="Nome da rotina"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 mb-6"
                            />
                            <div className="flex gap-3">
                                <button onClick={() => setIsEditingRoutineModal(false)} className="flex-1 py-3 text-slate-500 font-bold">Cancelar</button>
                                <button
                                    onClick={handleUpdateRoutineName}
                                    disabled={savingRoutine}
                                    className="flex-1 bg-primary text-white py-3 rounded-xl font-bold disabled:opacity-50"
                                >
                                    {savingRoutine ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Edit Workout Name Modal */}
            {
                editingWorkoutItem && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-scale-up border border-slate-100 dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Editar Nome do Treino</h2>
                            <input
                                type="text"
                                value={workoutName}
                                onChange={(e) => setWorkoutName(e.target.value)}
                                placeholder="Ex: Treino de Perna"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 mb-6"
                            />
                            <div className="flex gap-3">
                                <button onClick={() => setEditingWorkoutItem(null)} className="flex-1 py-3 text-slate-500 font-bold">Cancelar</button>
                                <button
                                    onClick={handleUpdateWorkoutName}
                                    disabled={savingWorkout}
                                    className="flex-1 bg-primary text-white py-3 rounded-xl font-bold disabled:opacity-50"
                                >
                                    {savingWorkout ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </MainLayout >
    );
};

export default StudentProfileView;
