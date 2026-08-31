import React, { useEffect, useState } from 'react';
import MainLayout from '../../components/Layout/MainLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { matchesSearch } from '../../utils/textUtils';

const Library: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [routines, setRoutines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Filters
    const [filterLevel, setFilterLevel] = useState('all');

    // Routine Modal State
    const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
    const [editingRoutine, setEditingRoutine] = useState<any | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        duration_minutes: '50-60',
        level: 'Iniciante',
        frequency: '3' // Default 3 days/week
    });
    const [saveLoading, setSaveLoading] = useState(false);

    // Assign Modal State
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedRoutineForAssign, setSelectedRoutineForAssign] = useState<any | null>(null);
    const [coachStudents, setCoachStudents] = useState<any[]>([]);
    const [assignLoading, setAssignLoading] = useState(false);

    useEffect(() => {
        if (user) {
            fetchRoutines();
        }
    }, [user]);

    const fetchRoutines = async (isBackground = false) => {
        try {
            if (!isBackground) setLoading(true);
            const { data: routinesData, error: routinesError } = await supabase
                .from('routines')
                .select('*')
                .eq('coach_id', user!.id)
                .eq('is_template', true)
                .order('created_at', { ascending: false });

            if (routinesError) throw routinesError;

            // Fetch workout counts
            const routinesWithCounts = await Promise.all(routinesData.map(async (routine) => {
                const { count } = await supabase
                    .from('workouts')
                    .select('*', { count: 'exact', head: true })
                    .eq('routine_id', routine.id);

                return {
                    ...routine,
                    workouts_count: count || 0
                };
            }));

            setRoutines(routinesWithCounts);
        } catch (error) {
            console.error('Error fetching routines:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async () => {
        try {
            const { data, error } = await supabase
                .from('students_data')
                .select('id, profiles:id(full_name, avatar_url)')
                .eq('coach_id', user!.id);

            if (error) throw error;
            setCoachStudents(data || []);
        } catch (error) {
            console.error('Error fetching students:', error);
        }
    };

    const handleOpenAssignModal = (routine: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedRoutineForAssign(routine);
        fetchStudents();
        setIsAssignModalOpen(true);
    };

    const handleAssign = async (studentId: string) => {
        if (!selectedRoutineForAssign) return;
        try {
            setAssignLoading(true);

            // 1. Fetch Original Routine Data (Deep)
            const { data: fullRoutine, error: fError } = await supabase
                .from('routines')
                .select(`
                    *,
                    workouts (
                        *,
                        workout_items (
                            *,
                            workout_sets (*)
                        )
                    )
                `)
                .eq('id', selectedRoutineForAssign.id)
                .order('day_number', { foreignTable: 'workouts', ascending: true })
                .order('order_index', { foreignTable: 'workouts.workout_items', ascending: true })
                .order('set_order', { foreignTable: 'workouts.workout_items.workout_sets', ascending: true })
                .single();

            if (fError) throw fError;

            // 2. Clone Routine (Student-specific)
            const { data: newRoutine, error: rError } = await supabase
                .from('routines')
                .insert([{
                    coach_id: user!.id,
                    name: fullRoutine.name,
                    description: fullRoutine.description,
                    is_template: false,
                    duration_weeks: fullRoutine.duration_weeks
                }])
                .select()
                .single();

            if (rError) throw rError;

            // 3. Clone Workouts and Descendants
            if (fullRoutine.workouts && fullRoutine.workouts.length > 0) {
                // We'll do this sequentially to maintain relationships correctly
                for (const w of fullRoutine.workouts) {
                    const { data: newW, error: wError } = await supabase
                        .from('workouts')
                        .insert([{
                            routine_id: newRoutine.id,
                            name: w.name,
                            day_number: w.day_number || w.order_index,
                            order_index: w.order_index || w.day_number
                        }])
                        .select()
                        .single();

                    if (wError) throw wError;

                    if (w.workout_items && w.workout_items.length > 0) {
                        for (const item of w.workout_items) {
                            const { data: newItem, error: iError } = await supabase
                                .from('workout_items')
                                .insert([{
                                    workout_id: newW.id,
                                    exercise_id: item.exercise_id,
                                    order_index: item.order_index,
                                    coach_notes: item.coach_notes
                                }])
                                .select()
                                .single();

                            if (iError) throw iError;

                            if (item.workout_sets && item.workout_sets.length > 0) {
                                const setsToInsert = item.workout_sets.map((s: any) => ({
                                    workout_item_id: newItem.id,
                                    type: s.type,
                                    reps_target: s.reps_target,
                                    rest_seconds: s.rest_seconds,
                                    rpe_target: s.rpe_target,
                                    order_index: s.order_index || s.set_order,
                                    set_order: s.set_order || s.order_index
                                }));

                                const { error: sError } = await supabase
                                    .from('workout_sets')
                                    .insert(setsToInsert);
                                if (sError) throw sError;
                            }
                        }
                    }
                }
            }

            // 4. Update Assignment to point to the NEW Routine
            // Deactivate previous
            await supabase
                .from('student_assignments')
                .update({ is_active: false })
                .eq('student_id', studentId);

            const { error: aError } = await supabase
                .from('student_assignments')
                .insert([{
                    student_id: studentId,
                    routine_id: newRoutine.id,
                    is_active: true,
                    started_at: new Date().toISOString().split('T')[0]
                }]);

            if (aError) throw aError;

            toast.success('Treino clonado e atribuído individualmente!');
            setIsAssignModalOpen(false);
        } catch (error) {
            console.error('Error assigning routine:', error);
            toast.error('Erro ao atribuir treino individual.');
        } finally {
            setAssignLoading(false);
        }
    };

    const handleSaveRoutine = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaveLoading(true);

            const descriptionText = JSON.stringify({
                duration: formData.duration_minutes,
                level: formData.level,
                frequency: formData.frequency
            });

            if (editingRoutine) {
                const { error } = await supabase
                    .from('routines')
                    .update({
                        name: formData.name,
                        description: descriptionText
                    })
                    .eq('id', editingRoutine.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('routines')
                    .insert([{
                        coach_id: user!.id,
                        name: formData.name,
                        description: descriptionText,
                        is_template: true
                    }]);
                if (error) throw error;
            }

            setIsRoutineModalOpen(false);
            setEditingRoutine(null);
            setFormData({ name: '', duration_minutes: '50-60', level: 'Iniciante', frequency: '3' });
            fetchRoutines(true);
            toast.success('Rotina salva com sucesso!');

        } catch (error) {
            console.error('Error saving routine:', error);
            toast.error('Erro ao salvar rotina.');
        } finally {
            setSaveLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Tem certeza? Isso apagará todos os treinos desta rotina.')) return;

        try {
            const { error } = await supabase.from('routines').delete().eq('id', id);
            if (error) throw error;
            fetchRoutines();
            toast.success('Rotina excluída com sucesso.');
        } catch (error) {
            console.error('Error deleting routine:', error);
            toast.error('Não é possível excluir rotina com atribuições ativas.');
        }
    };

    const handleEdit = (routine: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingRoutine(routine);
        const meta = parseMetadata(routine.description);
        setFormData({
            name: routine.name,
            duration_minutes: meta.duration || '',
            level: meta.level || 'Iniciante',
            frequency: meta.frequency || '3'
        });
        setIsRoutineModalOpen(true);
    };

    const parseMetadata = (description: string) => {
        try {
            return JSON.parse(description || '{}');
        } catch (e) {
            return { duration: '', level: 'Iniciante', frequency: '' };
        }
    };

    const filteredRoutines = routines.filter(r => {
        const meta = parseMetadata(r.description);
        const matchesSearchQuery = matchesSearch(r.name, searchTerm);
        const matchesLevel = filterLevel === 'all' || meta.level === filterLevel;
        return matchesSearchQuery && matchesLevel;
    });

    return (
        <MainLayout>
            <header className="px-5 py-6 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-30 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <Link
                        to="/coach/dashboard"
                        aria-label="Voltar para a dashboard"
                        className="w-11 h-11 min-w-[44px] min-h-[44px] -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
                    >
                        <span className="material-symbols-rounded text-slate-500" aria-hidden="true">arrow_back</span>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display">Biblioteca de Rotinas</h1>
                    </div>
                </div>
            </header>

            <div className="px-5 pt-4 space-y-4">
                {/* Search & Filter */}
                <div className="flex flex-col gap-3">
                    <div className="relative">
                        <span className="absolute left-4 top-3.5 material-symbols-rounded text-slate-400" aria-hidden="true">search</span>
                        <input
                            type="text"
                            placeholder="Buscar rotinas..."
                            aria-label="Buscar rotinas"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        />
                    </div>

                    {/* Level Filter Chips */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" role="tablist" aria-label="Filtro por nível de dificuldade">
                        {['all', 'Iniciante', 'Intermediário', 'Avançado'].map(level => (
                            <button
                                key={level}
                                type="button"
                                role="tab"
                                aria-selected={filterLevel === level}
                                onClick={() => setFilterLevel(level)}
                                className={`whitespace-nowrap min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center ${filterLevel === level
                                    ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900 shadow-sm'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {level === 'all' ? 'Todos' : level}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-10" role="status" aria-live="polite">
                            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-2"></div>
                            <span className="sr-only">Carregando rotinas da biblioteca...</span>
                        </div>
                    ) : filteredRoutines.length === 0 ? (
                        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                            <span className="material-symbols-rounded text-4xl text-slate-300 mb-2">fitness_center</span>
                            <p className="text-slate-500 dark:text-slate-400">Nenhuma rotina encontrada.</p>
                        </div>
                    ) : (
                        filteredRoutines.map(routine => {
                            const meta = parseMetadata(routine.description);
                            return (
                                <div
                                    key={routine.id}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Ver detalhes da rotina ${routine.name}`}
                                    onClick={() => navigate(`/coach/routine-details?id=${routine.id}`)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            navigate(`/coach/routine-details?id=${routine.id}`);
                                        }
                                    }}
                                    className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-soft border border-slate-100 dark:border-slate-700 transition-all active:scale-[0.99] cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                                >
                                    <div className="mb-3">
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{routine.name}</h3>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {meta.duration && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                    <span className="material-symbols-rounded text-[12px] mr-1" aria-hidden="true">timer</span>
                                                    {meta.duration} min
                                                </span>
                                            )}
                                            {meta.level && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                                    <span className="material-symbols-rounded text-[12px] mr-1" aria-hidden="true">fitness_center</span>
                                                    {meta.level}
                                                </span>
                                            )}
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                <span className="material-symbols-rounded text-[12px] mr-1" aria-hidden="true">calendar_today</span>
                                                {meta.frequency ? `${meta.frequency}x Sem` : `${routine.workouts_count} Treinos`}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700 mt-2">
                                        <button
                                            type="button"
                                            onClick={(e) => handleOpenAssignModal(routine, e)}
                                            aria-label={`Atribuir rotina ${routine.name} a um aluno`}
                                            className="min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors text-sm font-bold"
                                        >
                                            <span className="material-symbols-rounded text-lg" aria-hidden="true">person_add</span>
                                            Atribuir
                                        </button>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={(e) => handleEdit(routine, e)}
                                                aria-label={`Editar rotina ${routine.name}`}
                                                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-slate-400 hover:text-primary transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                                            >
                                                <span className="material-symbols-rounded text-xl" aria-hidden="true">edit</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => handleDelete(routine.id, e)}
                                                aria-label={`Excluir rotina ${routine.name}`}
                                                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-slate-400 hover:text-red-500 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                                            >
                                                <span className="material-symbols-rounded text-xl" aria-hidden="true">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="pt-2 pb-6">
                    <button
                        type="button"
                        onClick={() => {
                            setEditingRoutine(null);
                            setFormData({ name: '', duration_minutes: '50-60', level: 'Iniciante', frequency: '3' });
                            setIsRoutineModalOpen(true);
                        }}
                        aria-label="Adicionar nova rotina de treino"
                        className="w-full min-h-[52px] bg-sky-500 text-white py-4 rounded-xl shadow-lg shadow-sky-500/30 flex items-center justify-center gap-2 font-bold text-lg hover:bg-sky-600 transition-all transform active:scale-[0.98]"
                    >
                        <span className="material-symbols-rounded" aria-hidden="true">add_circle</span>
                        Adicionar Nova Rotina
                    </button>
                </div>
            </div>

            {/* Routine Modal */}
            {isRoutineModalOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={editingRoutine ? 'Editar Rotina' : 'Nova Rotina'}
                    className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm animate-fade-in"
                >
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl p-6 shadow-xl animate-scale-up">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {editingRoutine ? 'Editar Rotina' : 'Nova Rotina'}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setIsRoutineModalOpen(false)}
                                aria-label="Fechar janela de rotina"
                                className="min-w-[44px] min-h-[44px] p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
                            >
                                <span className="material-symbols-rounded" aria-hidden="true">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSaveRoutine} className="space-y-4">
                            <div>
                                <label htmlFor="lib-routine-name" className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Nome da Rotina</label>
                                <input
                                    id="lib-routine-name"
                                    required
                                    className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: Hipertrofia Avançada"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="lib-routine-duration" className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Duração Média (min)</label>
                                    <input
                                        id="lib-routine-duration"
                                        className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                        value={formData.duration_minutes}
                                        onChange={e => setFormData({ ...formData, duration_minutes: e.target.value })}
                                        placeholder="Ex: 50-70"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="lib-routine-freq" className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Frequência Semanal</label>
                                    <select
                                        id="lib-routine-freq"
                                        className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                        value={formData.frequency}
                                        onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7].map(num => <option key={num} value={num}>{num} dias</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="lib-routine-level" className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Nível</label>
                                <select
                                    id="lib-routine-level"
                                    className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                    value={formData.level}
                                    onChange={e => setFormData({ ...formData, level: e.target.value })}
                                >
                                    <option value="Iniciante">Iniciante</option>
                                    <option value="Intermediário">Intermediário</option>
                                    <option value="Avançado">Avançado</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsRoutineModalOpen(false)} aria-label="Cancelar edição de rotina" className="flex-1 min-h-[44px] py-3 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center justify-center">Cancelar</button>
                                <button type="submit" disabled={saveLoading} aria-label="Salvar informações da rotina" className="flex-1 min-h-[44px] bg-primary text-white font-bold rounded-xl py-3 shadow-lg hover:bg-sky-600 transition-colors flex items-center justify-center gap-2">
                                    {saveLoading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" role="status"></div>
                                            <span className="sr-only">Salvando rotina...</span>
                                            <span>Salvando...</span>
                                        </>
                                    ) : (
                                        <span>Salvar</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Modal */}
            {isAssignModalOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Atribuir ${selectedRoutineForAssign?.name || 'rotina'}`}
                    className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm animate-fade-in"
                >
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl p-6 shadow-xl max-h-[80vh] overflow-hidden flex flex-col animate-scale-up">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                Atribuir "{selectedRoutineForAssign?.name}"
                            </h2>
                            <button
                                type="button"
                                onClick={() => setIsAssignModalOpen(false)}
                                aria-label="Fechar janela de atribuição"
                                className="min-w-[44px] min-h-[44px] p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
                            >
                                <span className="material-symbols-rounded" aria-hidden="true">close</span>
                            </button>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Selecione um aluno para atribuir esta rotina. A rotina anterior será substituída.</p>

                        <div className="overflow-y-auto flex-1 space-y-2 pr-2">
                            {coachStudents.length === 0 ? (
                                <p className="text-center text-slate-500 py-4">Você ainda não tem alunos cadastrados.</p>
                            ) : (
                                coachStudents.map(student => (
                                    <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={student.profiles.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.profiles.full_name || 'Aluno')}&background=random`}
                                                alt={`Avatar de ${student.profiles.full_name}`}
                                                loading="lazy"
                                                width="40"
                                                height="40"
                                                className="w-10 h-10 rounded-full bg-slate-200 object-cover"
                                            />
                                            <span className="font-bold text-slate-900 dark:text-white text-sm">{student.profiles.full_name}</span>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={assignLoading}
                                            onClick={() => handleAssign(student.id)}
                                            aria-label={`Atribuir rotina para o aluno ${student.profiles.full_name}`}
                                            className="min-h-[44px] px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-sky-600 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
                                        >
                                            Selecionar
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsAssignModalOpen(false)}
                            aria-label="Fechar janela"
                            className="mt-4 w-full min-h-[44px] py-3 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center justify-center"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};

export default Library;