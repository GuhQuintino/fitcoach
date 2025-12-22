import React, { useEffect, useState, useRef } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';

const RoutineDetails: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const routineId = searchParams.get('id');

    const [routine, setRoutine] = useState<any>(null);
    const [workouts, setWorkouts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Workout Modal (Add/Edit)
    const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState<any | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        duration_minutes: ''
    });
    const [saveLoading, setSaveLoading] = useState(false);

    // Drag & Drop State
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (user && routineId) {
            fetchRoutineDetails();
        } else if (!routineId) {
            navigate('/coach/library');
        }
    }, [user, routineId]);

    const fetchRoutineDetails = async () => {
        try {
            setLoading(true);

            // 1. Fetch Routine Info
            const { data: routineData, error: routineError } = await supabase
                .from('routines')
                .select('*')
                .eq('id', routineId)
                .single();

            if (routineError) throw routineError;
            setRoutine(routineData);

            // 2. Fetch Workouts with Exercise Counts
            const { data: workoutsData, error: workoutsError } = await supabase
                .from('workouts')
                .select(`
                    *,
                    workout_items (count)
                `)
                .eq('routine_id', routineId)
                .order('day_number', { ascending: true }); // Using day_number for ordering

            if (workoutsError) throw workoutsError;

            const formattedWorkouts = workoutsData?.map((w: any) => ({
                ...w,
                exercise_count: w.workout_items[0]?.count || 0
            })) || [];

            setWorkouts(formattedWorkouts);

        } catch (error) {
            console.error('Error fetching routine details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveWorkout = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaveLoading(true);

            // Determine order/day_number
            let dayNumber = 1;
            if (editingWorkout) {
                dayNumber = editingWorkout.day_number;
            } else {
                // New workout goes to end
                dayNumber = workouts.length + 1;
            }

            const payload = {
                routine_id: routineId,
                name: formData.name,
                description: formData.description,
                duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
                day_number: dayNumber
            };

            if (editingWorkout) {
                const { error } = await supabase
                    .from('workouts')
                    .update(payload)
                    .eq('id', editingWorkout.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('workouts')
                    .insert([payload]);
                if (error) throw error;
            }

            setIsWorkoutModalOpen(false);
            setEditingWorkout(null);
            setFormData({ name: '', description: '', duration_minutes: '' });
            fetchRoutineDetails();

        } catch (error) {
            console.error('Error saving workout:', error);
            alert('Erro ao salvar treino.');
        } finally {
            setSaveLoading(false);
        }
    };

    const handleDeleteWorkout = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Tem certeza que deseja excluir este treino?')) return;

        try {
            const { error } = await supabase
                .from('workouts')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchRoutineDetails();
        } catch (error) {
            console.error('Error deleting workout:', error);
        }
    };

    const handleEditWorkout = (workout: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingWorkout(workout);
        setFormData({
            name: workout.name,
            description: workout.description || '',
            duration_minutes: workout.duration_minutes || ''
        });
        setIsWorkoutModalOpen(true);
    };

    // --- Drag and Drop Logic ---
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        try {
            dragItem.current = position;
            setIsDragging(true);
            // Visual feedback
            e.currentTarget.classList.add('opacity-50', 'scale-[0.98]', 'bg-slate-50', 'dark:bg-slate-700');
            // Safe dataTransfer access
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
            }
        } catch (err) {
            console.warn("Drag Start Error:", err);
        }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        try {
            dragOverItem.current = position;
            e.preventDefault();
        } catch (err) { console.warn("Drag Enter Error:", err); }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        try {
            e.preventDefault(); // Necessary to allow dropping
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = 'move';
            }
        } catch (err) { console.warn("Drag Over Error:", err); }
    };

    const handleDragEnd = async (e: React.DragEvent<HTMLDivElement>) => {
        try {
            setIsDragging(false);
            e.currentTarget.classList.remove('opacity-50', 'scale-[0.98]', 'bg-slate-50', 'dark:bg-slate-700');

            if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
                const _workouts = [...workouts];
                const draggedItemContent = _workouts.splice(dragItem.current, 1)[0];
                _workouts.splice(dragOverItem.current, 0, draggedItemContent);

                // Update local state immediately
                setWorkouts(_workouts);

                // Update backend
                const updates = _workouts.map((w, index) => ({
                    id: w.id,
                    day_number: index + 1
                }));

                for (const update of updates) {
                    await supabase
                        .from('workouts')
                        .update({ day_number: update.day_number })
                        .eq('id', update.id);
                }
            }
        } catch (error) {
            console.error("Error updating order:", error);
        } finally {
            dragItem.current = null;
            dragOverItem.current = null;
        }
    };

    const parseMeta = (desc: string) => {
        try {
            return JSON.parse(desc || '{}');
        } catch (e) {
            return {};
        }
    };
    const meta = routine ? parseMeta(routine.description) : {};

    return (
        <MainLayout className="pb-24">
            <header className="px-5 py-6 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-30 border-b border-slate-100 dark:border-slate-700 transition-all duration-300">
                <div className="flex items-center gap-3">
                    <Link to="/coach/library" className="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors active:scale-95">
                        <span className="material-symbols-rounded text-slate-500">arrow_back</span>
                    </Link>
                    <div>
                        {loading ? (
                            <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                        ) : (
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display">{routine?.name || 'Detalhes da Rotina'}</h1>
                        )}
                    </div>
                </div>
                {/* Add Workout Button in Header */}
                <button
                    onClick={() => {
                        setEditingWorkout(null);
                        setFormData({ name: '', description: '', duration_minutes: '' });
                        setIsWorkoutModalOpen(true);
                    }}
                    className="p-2 bg-primary text-white rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center font-bold hover:bg-primary-dark transition-all transform active:scale-95 duration-200"
                >
                    <span className="material-symbols-rounded">add</span>
                </button>
            </header>

            <main className="px-5 pt-4 space-y-6">
                {/* Routine Info Card */}
                {!loading && routine && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-slate-100 dark:border-slate-700">
                        <div className="flex flex-wrap gap-3 mb-2">
                            {meta.level && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                    <span className="material-symbols-rounded text-[14px] mr-1">fitness_center</span>
                                    {meta.level}
                                </span>
                            )}
                            {meta.duration && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                    <span className="material-symbols-rounded text-[14px] mr-1">timer</span>
                                    {meta.duration} min
                                </span>
                            )}
                            {meta.frequency && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                    <span className="material-symbols-rounded text-[14px] mr-1">calendar_today</span>
                                    {meta.frequency} dias/sem
                                </span>
                            )}
                        </div>
                        <p className="text-slate-500 text-sm mt-3">
                            {workouts.length} treinos cadastrados nesta rotina.
                        </p>
                    </div>
                )}

                {/* Workouts List */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="font-bold text-slate-900 dark:text-white">Treinos</h2>
                        {workouts.length > 1 && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                <span className="material-symbols-rounded text-sm">drag_indicator</span>
                                Arraste para ordenar
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse"></div>)}
                        </div>
                    ) : workouts.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                            <p className="text-slate-500 mb-2">Sem treinos ainda.</p>
                            <button
                                onClick={() => setIsWorkoutModalOpen(true)}
                                className="text-primary font-bold text-sm hover:underline"
                            >
                                Criar primeiro treino
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {workouts.map((workout, index) => (
                                <div
                                    key={workout.id}
                                    draggable={true} // Explicitly true
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragEnter={(e) => handleDragEnter(e, index)}
                                    onDragOver={handleDragOver}
                                    onDragEnd={handleDragEnd}
                                    className={`
                                        bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 
                                        cursor-grab active:cursor-grabbing 
                                        transition-all duration-200 ease-out translate-z-0
                                        active:scale-[0.98] active:opacity-75 active:shadow-md
                                        hover:border-slate-300 dark:hover:border-slate-600
                                        ${isDragging && dragItem.current === index ? 'opacity-50 scale-[0.98] bg-slate-50 dark:bg-slate-700 ring-2 ring-primary/20' : ''}
                                    `}
                                    style={{ touchAction: 'pan-y' }} // Improve touch handling - mostly for vertical scrolling
                                >
                                    {/* Drag Handle Visual - Enhanced Target */}
                                    <div className="text-slate-300 p-2 -ml-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-amber-500 transition-colors cursor-grab active:cursor-grabbing">
                                        <span className="material-symbols-rounded">drag_indicator</span>
                                    </div>

                                    <div className="flex-1 min-w-0 cursor-pointer select-none" onClick={() => navigate(`/coach/editor?workout_id=${workout.id}`)}>
                                        <h3 className="font-bold text-slate-900 dark:text-white truncate text-base">{workout.name}</h3>
                                        <p className="text-xs text-slate-500 truncate mb-1">
                                            {workout.description || 'Sem descrição'}
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 font-bold">
                                                {workout.duration_minutes ? `${workout.duration_minutes} min` : '- min'}
                                            </span>
                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 font-bold">
                                                {workout.exercise_count} Exercícios
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => handleEditWorkout(workout, e)}
                                            className="p-2 text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer active:scale-90"
                                        >
                                            <span className="material-symbols-rounded">edit</span>
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteWorkout(workout.id, e)}
                                            className="p-2 text-slate-400 hover:text-red-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer active:scale-90"
                                        >
                                            <span className="material-symbols-rounded">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Floating Action Button (Alternative) or Bottom Button */}
                {workouts.length > 0 && (
                    <div className="py-6">
                        {/* Relative bottom button */}
                        <button
                            onClick={() => {
                                setEditingWorkout(null);
                                setFormData({ name: '', description: '', duration_minutes: '' });
                                setIsWorkoutModalOpen(true);
                            }}
                            className="w-full bg-primary text-white py-4 rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2 font-bold text-lg hover:bg-primary-dark transition-all transform active:scale-[0.98]"
                        >
                            <span className="material-symbols-rounded">add_circle</span>
                            Adicionar Novo Treino
                        </button>
                    </div>
                )}
            </main>

            {isWorkoutModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-scale-up">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                            {editingWorkout ? 'Editar Treino' : 'Novo Treino'}
                        </h2>
                        <form onSubmit={handleSaveWorkout} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Treino</label>
                                <input
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: Treino A - Peito e Tríceps"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Duração Estimada (min)</label>
                                <input
                                    type="number"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50"
                                    value={formData.duration_minutes}
                                    onChange={e => setFormData({ ...formData, duration_minutes: e.target.value })}
                                    placeholder="Ex: 60"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição / Observações</label>
                                <textarea
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 h-24 resize-none"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Instruções para o aluno..."
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsWorkoutModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancelar</button>
                                <button type="submit" disabled={saveLoading} className="flex-1 bg-primary text-white font-bold rounded-xl py-3 shadow-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-2">
                                    {saveLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};

export default RoutineDetails;