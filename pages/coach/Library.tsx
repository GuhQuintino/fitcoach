import React, { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

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

    const fetchRoutines = async () => {
        try {
            setLoading(true);
            const { data: routinesData, error: routinesError } = await supabase
                .from('routines')
                .select('*')
                .eq('coach_id', user!.id)
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

            // Deactivate previous active routines for this student
            await supabase
                .from('student_assignments')
                .update({ is_active: false })
                .eq('student_id', studentId);

            // Create new assignment
            const { error } = await supabase
                .from('student_assignments')
                .insert([{
                    student_id: studentId,
                    routine_id: selectedRoutineForAssign.id,
                    coach_id: user!.id,
                    is_active: true,
                    assigned_at: new Date()
                }]);

            if (error) throw error;

            alert(`Rotina atribuída com sucesso para o aluno!`);
            setIsAssignModalOpen(false);
        } catch (error) {
            console.error('Error assigning routine:', error);
            alert('Erro ao atribuir rotina.');
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
                        description: descriptionText
                    }]);
                if (error) throw error;
            }

            setIsRoutineModalOpen(false);
            setEditingRoutine(null);
            setFormData({ name: '', duration_minutes: '50-60', level: 'Iniciante', frequency: '3' });
            fetchRoutines();

        } catch (error) {
            console.error('Error saving routine:', error);
            alert('Erro ao salvar rotina.');
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
        } catch (error) {
            console.error('Error deleting routine:', error);
            alert('Cannot delete routine with active assignments.');
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
        const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLevel = filterLevel === 'all' || meta.level === filterLevel;
        return matchesSearch && matchesLevel;
    });

    return (
        <MainLayout className="pb-24">
            <header className="px-5 py-6 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-30 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <Link to="/coach/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <span className="material-symbols-rounded text-slate-500">arrow_back</span>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display">Biblioteca de Rotinas</h1>
                    </div>
                </div>
            </header>

            <main className="px-5 pt-4 space-y-4">
                {/* Search & Filter */}
                <div className="flex flex-col gap-3">
                    <div className="relative">
                        <span className="absolute left-4 top-3.5 material-symbols-rounded text-slate-400">search</span>
                        <input
                            type="text"
                            placeholder="Buscar rotinas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        />
                    </div>

                    {/* Level Filter Chips */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {['all', 'Iniciante', 'Intermediário', 'Avançado'].map(level => (
                            <button
                                key={level}
                                onClick={() => setFilterLevel(level)}
                                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${filterLevel === level
                                        ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900'
                                        : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                                    }`}
                            >
                                {level === 'all' ? 'Todos' : level}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
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
                                    onClick={() => navigate(`/coach/routine-details?id=${routine.id}`)}
                                    className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-soft border border-slate-100 dark:border-slate-700 transition-all active:scale-[0.99] cursor-pointer"
                                >
                                    <div className="mb-3">
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{routine.name}</h3>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {meta.duration && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                    <span className="material-symbols-rounded text-[12px] mr-1">timer</span>
                                                    {meta.duration} min
                                                </span>
                                            )}
                                            {meta.level && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                                    <span className="material-symbols-rounded text-[12px] mr-1">fitness_center</span>
                                                    {meta.level}
                                                </span>
                                            )}
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                <span className="material-symbols-rounded text-[12px] mr-1">calendar_today</span>
                                                {meta.frequency ? `${meta.frequency}x Sem` : `${routine.workouts_count} Treinos`}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700 mt-2">
                                        <button
                                            onClick={(e) => handleOpenAssignModal(routine, e)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors text-sm font-bold"
                                        >
                                            <span className="material-symbols-rounded text-lg">person_add</span>
                                            Atribuir
                                        </button>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => handleEdit(routine, e)}
                                                className="p-2 text-slate-400 hover:text-primary transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                                            >
                                                <span className="material-symbols-rounded text-xl">edit</span>
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(routine.id, e)}
                                                className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                                            >
                                                <span className="material-symbols-rounded text-xl">delete</span>
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
                        onClick={() => {
                            setEditingRoutine(null);
                            setFormData({ name: '', duration_minutes: '50-60', level: 'Iniciante', frequency: '3' });
                            setIsRoutineModalOpen(true);
                        }}
                        className="w-full bg-primary text-white py-4 rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2 font-bold text-lg hover:bg-primary-dark transition-all transform active:scale-[0.98]"
                    >
                        <span className="material-symbols-rounded">add_circle</span>
                        Adicionar Nova Rotina
                    </button>
                </div>
            </main>

            {/* Routine Modal */}
            {isRoutineModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-scale-up">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                            {editingRoutine ? 'Editar Rotina' : 'Nova Rotina'}
                        </h2>
                        <form onSubmit={handleSaveRoutine} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Rotina</label>
                                <input
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: Hipertrofia Avançada"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Duração Média (min)</label>
                                    <input
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50"
                                        value={formData.duration_minutes}
                                        onChange={e => setFormData({ ...formData, duration_minutes: e.target.value })}
                                        placeholder="Ex: 50-70"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Frequência Semanal</label>
                                    <select
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50"
                                        value={formData.frequency}
                                        onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7].map(num => <option key={num} value={num}>{num} dias</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nível</label>
                                <select
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50"
                                    value={formData.level}
                                    onChange={e => setFormData({ ...formData, level: e.target.value })}
                                >
                                    <option value="Iniciante">Iniciante</option>
                                    <option value="Intermediário">Intermediário</option>
                                    <option value="Avançado">Avançado</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsRoutineModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancelar</button>
                                <button type="submit" disabled={saveLoading} className="flex-1 bg-primary text-white font-bold rounded-xl py-3 shadow-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-2">
                                    {saveLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Modal */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-scale-up max-h-[80vh] overflow-hidden flex flex-col">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                            Atribuir "{selectedRoutineForAssign?.name}"
                        </h2>
                        <p className="text-sm text-slate-500 mb-4">Selecione um aluno para atribuir esta rotina. A rotina anterior será substituída.</p>

                        <div className="overflow-y-auto flex-1 space-y-2 pr-2">
                            {coachStudents.length === 0 ? (
                                <p className="text-center text-slate-500 py-4">Você ainda não tem alunos cadastrados.</p>
                            ) : (
                                coachStudents.map(student => (
                                    <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={student.profiles.avatar_url || `https://ui-avatars.com/api/?name=${student.profiles.full_name}&background=random`}
                                                alt=""
                                                className="w-10 h-10 rounded-full bg-slate-200"
                                            />
                                            <span className="font-bold text-slate-900 dark:text-white text-sm">{student.profiles.full_name}</span>
                                        </div>
                                        <button
                                            disabled={assignLoading}
                                            onClick={() => handleAssign(student.id)}
                                            className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark transition-colors"
                                        >
                                            Selecionar
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <button
                            onClick={() => setIsAssignModalOpen(false)}
                            className="mt-4 w-full py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
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