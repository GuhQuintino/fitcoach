import React, { useEffect, useState, useRef } from 'react';
import MainLayout from '../../components/Layout/MainLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import ExerciseCard from '../../components/coach/editor/ExerciseCard';
import Exercises from './Exercises'; // Correct component for exercises
import WorkoutImportModal from '../../components/coach/editor/WorkoutImportModal';
import toast from 'react-hot-toast';
import ExerciseFormModal from '../../components/coach/exercises/ExerciseFormModal';

const Editor: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const workoutId = searchParams.get('workout_id');
    const studentId = searchParams.get('student_id');

    const [workout, setWorkout] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Estados e função para edição inline de exercícios
    const [editingExercise, setEditingExercise] = useState<any | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);

    const handleSaveExercise = async (data: any) => {
        try {
            setSaveLoading(true);
            const payload = {
                name: data.name,
                muscle_group: data.muscle_group,
                video_url: data.video_url,
                description: data.description,
                exercise_type: data.exercise_type || 'reps',
                muscle_weights: data.muscle_weights || {}
            };

            const { error } = await supabase
                .from('exercises')
                .update(payload)
                .eq('id', editingExercise.id);
            if (error) throw error;

            // Atualiza localmente no estado items do editor
            setItems(prevItems =>
                prevItems.map(item => {
                    if (item.exercise_id === editingExercise.id) {
                        return {
                            ...item,
                            exercise: {
                                ...item.exercise,
                                name: data.name,
                                description: data.description,
                                video_url: data.video_url,
                                exercise_type: data.exercise_type,
                                muscle_weights: data.muscle_weights
                            }
                        };
                    }
                    return item;
                })
            );

            setEditingExercise(null);
            toast.success('Exercício atualizado com sucesso!');
        } catch (error) {
            console.error('Error saving exercise:', error);
            toast.error('Erro ao salvar exercício.');
        } finally {
            setSaveLoading(false);
        }
    };

    // Auto-save debounce timer
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Initial Fetch
    useEffect(() => {
        if (workoutId) fetchWorkoutData();
    }, [workoutId]);

    const fetchWorkoutData = async () => {
        try {
            setLoading(true);
            setItems([]); // Clear current items to avoid ghost data
            // Fetch workout details + routine name
            const { data: wData, error: wError } = await supabase
                .from('workouts')
                .select(`*, routines (name)`)
                .eq('id', workoutId)
                .single();

            if (wError) throw wError;
            setWorkout(wData);

            // Fetch Items + Sets + Exercise Details
            // Note: complex join.
            const { data: iData, error: iError } = await supabase
                .from('workout_items')
                .select(`
                    *,
                    exercise:exercises(*),
                    sets:workout_sets(*)
                `)
                .eq('workout_id', workoutId)
                .order('order_index');

            if (iError) throw iError;

            // Sort sets by set_order inside each item
            const formattedItems = iData.map(item => ({
                ...item,
                sets: item.sets.sort((a: any, b: any) => a.set_order - b.set_order)
            }));

            setItems(formattedItems);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- State Management ---
    const handleUpdateItem = (index: number, updatedItem: any) => {
        const newItems = [...items];
        newItems[index] = updatedItem;
        setItems(newItems);
        setHasUnsavedChanges(true);
    };

    const handleDeleteItem = async (index: number) => {
        if (!confirm('Remover exercício?')) return;
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
        setHasUnsavedChanges(true);
    };

    // --- Drag & Drop ---
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const handleDragStart = (e: any, position: number) => {
        dragItem.current = position;
    };
    const handleDragEnter = (e: any, position: number) => {
        dragOverItem.current = position;
    };
    const handleDragEnd = () => {
        if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
            const _items = [...items];
            const draggedItemContent = _items.splice(dragItem.current, 1)[0];
            _items.splice(dragOverItem.current, 0, draggedItemContent);
            setItems(_items);
            setHasUnsavedChanges(true);
        }
        dragItem.current = null;
        dragOverItem.current = null;
    };


    // --- Adding Exercise (Library Modal) ---
    const [showLibrary, setShowLibrary] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [swapIndex, setSwapIndex] = useState<number | null>(null);

    // --- Swap Exercise ---
    const handleSwapExercise = (index: number) => {
        setSwapIndex(index);
        setShowLibrary(true);
    };

    const handleSwapConfirm = (exerciseData: any) => {
        if (swapIndex === null) return;
        const exercise = Array.isArray(exerciseData) ? exerciseData[0] : exerciseData;
        setItems(prev => {
            const newItems = [...prev];
            newItems[swapIndex] = {
                ...newItems[swapIndex],
                exercise_id: exercise.id,
                exercise: exercise,
            };
            return newItems;
        });
        setHasUnsavedChanges(true);
        setSwapIndex(null);
        setShowLibrary(false);
    };

    // This function will be called by Library when user selects an exercise
    // We need to modify Library to accept an 'onSelect' prop or handle it here via a specialized Library component
    // For now assuming existing Library can work if modified or wrapped.
    // Let's implement a simple handler that we'll pass to the Library (which we will refactor next)
    // Let's implement a simple handler that we'll pass to the Library (which we will refactor next)
    const handleAddExercise = (exercisesData: any | any[]) => {
        // Normalize to array
        const exercisesToAdd = Array.isArray(exercisesData) ? exercisesData : [exercisesData];

        const newItemsToAdd = exercisesToAdd.map((exercise: any) => {
            const exerciseType = exercise.exercise_type || 'reps';
            let initialSet: any = {
                id: `temp-set-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                set_order: 1,
                type: 'working',
                rest_seconds: '60',
                rpe_target: '8'
            };

            if (exerciseType === 'cardio') {
                initialSet = {
                    ...initialSet,
                    distance_target: '1.0',
                    speed_target: '8.0',
                    time_target: '600',
                    is_hiit: false
                };
            } else if (exerciseType === 'time') {
                initialSet = {
                    ...initialSet,
                    time_target: '60',
                    weight_target: ''
                };
            } else {
                initialSet = {
                    ...initialSet,
                    reps_target: '10',
                    weight_target: ''
                };
            }

            return {
                id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // unique temp ID
                exercise_id: exercise.id,
                exercise: exercise,
                coach_notes: '',
                sets: [initialSet]
            };
        });

        setItems(prev => [...prev, ...newItemsToAdd]);
        setHasUnsavedChanges(true);
        setShowLibrary(false);
    };

    const handleImportExercises = (importedItems: any[]) => {
        const newItemsToAdd = importedItems.map((item: any) => ({
            id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            exercise_id: item.exercise_id,
            exercise: item.exercise, // Ensure exercise object is present
            coach_notes: item.coach_notes || '',
            sets: (item.sets || []).map((s: any) => ({
                id: `temp-set-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                set_order: s.set_order, // Keep original order
                type: s.type || 'working',
                reps_target: s.reps_target,
                rest_seconds: s.rest_seconds,
                rpe_target: s.rpe_target,
                weight_target: s.weight_target,
                // Copiar novas metas se existirem
                time_target: s.time_target,
                distance_target: s.distance_target,
                speed_target: s.speed_target,
                hiit_work_seconds: s.hiit_work_seconds,
                hiit_rest_seconds: s.hiit_rest_seconds,
                hiit_work_speed: s.hiit_work_speed,
                hiit_rest_speed: s.hiit_rest_speed,
                hiit_cycles: s.hiit_cycles
            }))
        }));

        setItems(prev => [...prev, ...newItemsToAdd]);
        setHasUnsavedChanges(true);
    };


    // Race condition lock
    const isSavingRef = useRef(false);

    // --- Saving ---
    const handleSave = async (isManual = true) => {
        // Prevent overlapping saves
        if (isSavingRef.current) return;

        // Immediately cancel any pending auto-save to prevent race
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
        }

        try {
            isSavingRef.current = true;
            if (isManual) setSaving(true);
            else setIsAutoSaving(true);

            // 1. Clean up removed Items
            const currentIds = items.filter(i => !i.id.toString().startsWith('temp') && !i.id.toString().startsWith('loaded')).map(i => i.id);
            if (currentIds.length > 0) {
                // Delete items that are NOT in the current list
                await supabase.from('workout_items').delete().eq('workout_id', workoutId).not('id', 'in', `(${currentIds.join(',')})`);
            } else {
                await supabase.from('workout_items').delete().eq('workout_id', workoutId);
            }

            // 2. Separate Items into inserts and updates to avoid PostgREST null primary key issues
            const itemsToUpdate = items
                .filter(item => !item.id.toString().startsWith('temp') && !item.id.toString().startsWith('loaded'))
                .map((item, i) => ({
                    id: item.id,
                    workout_id: workoutId,
                    exercise_id: item.exercise_id,
                    order_index: i + 1,
                    coach_notes: item.coach_notes
                }));

            const itemsToInsert = items
                .filter(item => item.id.toString().startsWith('temp') || item.id.toString().startsWith('loaded'))
                .map((item) => ({
                    workout_id: workoutId,
                    exercise_id: item.exercise_id,
                    order_index: items.indexOf(item) + 1,
                    coach_notes: item.coach_notes
                }));

            const itemIdMap = new Map<string, string>();
            const dbItemsSaved: any[] = [];

            // A. Execute Updates for workout_items
            if (itemsToUpdate.length > 0) {
                const { data: dbUpdates, error: itemsError } = await supabase
                    .from('workout_items')
                    .upsert(itemsToUpdate)
                    .select();
                if (itemsError) throw itemsError;
                dbItemsSaved.push(...dbUpdates);
            }

            // B. Execute Inserts for workout_items
            if (itemsToInsert.length > 0) {
                const { data: dbInserts, error: itemsError } = await supabase
                    .from('workout_items')
                    .insert(itemsToInsert)
                    .select();
                if (itemsError) throw itemsError;
                dbItemsSaved.push(...dbInserts);
            }

            // C. Map local IDs to database IDs
            dbItemsSaved.forEach((dbItem: any) => {
                const localItem = items.find((li, idx) => li.exercise_id === dbItem.exercise_id && idx === dbItem.order_index - 1);
                if (localItem) {
                    itemIdMap.set(localItem.id, dbItem.id);
                }
            });

            // 3. Prepare all sets (separate inserts and updates) and delete orphan sets
            const setsToUpdate: any[] = [];
            const setsToInsert: any[] = [];
            const activeSetIds: string[] = [];
            const workoutItemIdsInUse: string[] = [];

            items.forEach((item) => {
                const realItemId = itemIdMap.get(item.id) || item.id;
                workoutItemIdsInUse.push(realItemId);

                item.sets.forEach((set: any, j: number) => {
                    const payload: any = {
                        workout_item_id: realItemId,
                        set_order: j + 1,
                        order_index: j + 1,
                        type: set.type,
                        reps_target: set.reps_target || null,
                        rest_seconds: parseInt(set.rest_seconds) || 60,
                        rpe_target: set.rpe_target ? parseFloat(set.rpe_target) : 8,
                        weight_target: set.weight_target ? parseFloat(set.weight_target) : null,
                        time_target: set.time_target ? parseInt(set.time_target) : null,
                        distance_target: set.distance_target ? parseFloat(set.distance_target) : null,
                        speed_target: set.speed_target ? parseFloat(set.speed_target) : null,
                        hiit_work_seconds: set.hiit_work_seconds ? parseInt(set.hiit_work_seconds) : null,
                        hiit_rest_seconds: set.hiit_rest_seconds ? parseInt(set.hiit_rest_seconds) : null,
                        hiit_work_speed: set.hiit_work_speed ? parseFloat(set.hiit_work_speed) : null,
                        hiit_rest_speed: set.hiit_rest_speed ? parseFloat(set.hiit_rest_speed) : null,
                        hiit_cycles: set.hiit_cycles ? parseInt(set.hiit_cycles) : null
                    };

                    if (!set.id.toString().startsWith('new') && !set.id.toString().startsWith('temp') && !set.id.toString().startsWith('loaded')) {
                        payload.id = set.id;
                        activeSetIds.push(set.id);
                        setsToUpdate.push(payload);
                    } else {
                        setsToInsert.push(payload);
                    }
                });
            });

            // Delete orphan sets
            if (workoutItemIdsInUse.length > 0) {
                let deleteQuery = supabase.from('workout_sets').delete().in('workout_item_id', workoutItemIdsInUse);
                if (activeSetIds.length > 0) {
                    deleteQuery = deleteQuery.not('id', 'in', `(${activeSetIds.join(',')})`);
                }
                const { error: deleteError } = await deleteQuery;
                if (deleteError) throw deleteError;
            }

            const dbSetsSaved: any[] = [];

            // A. Execute Updates for workout_sets
            if (setsToUpdate.length > 0) {
                const { data: dbUpdates, error: setsError } = await supabase
                    .from('workout_sets')
                    .upsert(setsToUpdate)
                    .select();
                if (setsError) throw setsError;
                dbSetsSaved.push(...dbUpdates);
            }

            // B. Execute Inserts for workout_sets
            if (setsToInsert.length > 0) {
                const { data: dbInserts, error: setsError } = await supabase
                    .from('workout_sets')
                    .insert(setsToInsert)
                    .select();
                if (setsError) throw setsError;
                dbSetsSaved.push(...dbInserts);
            }

            const setIdMap = new Map<string, string>();
            dbSetsSaved.forEach((dbSet: any) => {
                const localItem = items.find(li => (itemIdMap.get(li.id) || li.id) === dbSet.workout_item_id);
                if (localItem) {
                    const localSet = localItem.sets.find((ls: any) => ls.set_order === dbSet.set_order);
                    if (localSet && (localSet.id.toString().startsWith('new') || localSet.id.toString().startsWith('temp') || localSet.id.toString().startsWith('loaded'))) {
                        setIdMap.set(localSet.id, dbSet.id);
                    }
                }
            });

            // Sync state with new IDs functionally
            setItems(currentItems => {
                return currentItems.map(item => {
                    const newItemId = itemIdMap.get(item.id) || item.id;
                    const newSets = item.sets.map((set: any) => ({
                        ...set,
                        id: setIdMap.get(set.id) || set.id,
                        workout_item_id: newItemId
                    }));

                    return {
                        ...item,
                        id: newItemId,
                        sets: newSets
                    };
                });
            });

            // Success
            setHasUnsavedChanges(false);
            setLastSaved(new Date());

            if (isManual) {
                navigate(-1);
                toast.success('Treino salvo com sucesso!');
            }

        } catch (error) {
            console.error('Save Error:', error);
            if (isManual) toast.error('Erro ao salvar treino. Tente novamente.');
        } finally {
            setSaving(false);
            isSavingRef.current = false;
        }
    };

    // Auto-save effect
    useEffect(() => {
        // Don't start timer if already saving
        if (!loading && hasUnsavedChanges && !isSavingRef.current) {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

            saveTimerRef.current = setTimeout(() => {
                handleSave(false);
            }, 3000); // Save after 3 seconds of inactivity
        }

        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [items, hasUnsavedChanges, loading]);

    // Prevent accidental navigation with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const handleBack = () => {
        if (hasUnsavedChanges) {
            if (confirm('Existem alterações não salvas. Deseja sair mesmo assim?')) {
                navigate(-1);
            }
        } else {
            navigate(-1);
        }
    };

    return (
        <MainLayout>
            {/* Header */}
            <header className="w-full px-5 py-4 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-30 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <button onClick={handleBack} className="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <span className="material-symbols-rounded text-slate-500">arrow_back</span>
                    </button>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{workout?.routines?.name}</p>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-bold text-slate-900 dark:text-white font-display leading-tight">{workout?.name || 'Editor'}</h1>
                            {isAutoSaving ? (
                                <span className="bg-sky-50 dark:bg-sky-900/20 text-sky-500 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse border border-sky-100 dark:border-sky-500/20">
                                    <span className="material-symbols-rounded text-[12px]">sync</span>
                                    Salvando
                                </span>
                            ) : lastSaved ? (
                                <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-100 dark:border-emerald-500/20">
                                    <span className="material-symbols-rounded text-[12px]">done</span>
                                    Sincronizado {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold px-6 py-2.5 rounded-2xl transition-all disabled:opacity-50 shadow-md hover:shadow-glow active:scale-95 text-sm"
                >
                    {saving ? 'Salvando...' : 'Sair e Salvar'}
                </button>
            </header>

            {/* List */}
            <main className="w-full overflow-x-hidden px-2 sm:px-5 pt-6 max-w-2xl mx-auto pb-10">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-slate-500 font-medium">{items.length} exercícios</p>
                </div>

                {loading ? (
                    <div className="space-y-4 animate-pulse">
                        <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                        <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {items.map((item, index) => (
                            <div
                                key={item.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnter={(e) => handleDragEnter(e, index)}
                                onDragEnd={handleDragEnd}
                                className="transition-all"
                            >
                                <ExerciseCard
                                    item={item}
                                    index={index}
                                    studentId={studentId}
                                    onUpdate={(updated) => handleUpdateItem(index, updated)}
                                    onDelete={() => handleDeleteItem(index)}
                                    onSwapExercise={() => handleSwapExercise(index)}
                                    onEditExercise={() => setEditingExercise(item.exercise)}
                                />
                            </div>
                        ))}

                        {/* Relative Footer Button - Moves down as list grows */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setShowImport(true)}
                                className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex flex-col items-center justify-center gap-1"
                            >
                                <span className="material-symbols-rounded">download</span>
                                <span className="text-sm">Importar</span>
                            </button>

                            <button
                                onClick={() => setShowLibrary(true)}
                                className="w-full py-4 rounded-2xl border-2 border-dashed border-primary/30 text-primary font-bold hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-1"
                            >
                                <span className="material-symbols-rounded">add_circle</span>
                                <span className="text-sm">Adicionar</span>
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Library Modal Overlay */}
            {showLibrary && (
                <div className="fixed inset-0 z-[60] bg-white dark:bg-slate-900 overflow-auto">
                    {/* Simplified Header for Modal Mode */}
                    <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-4 flex items-center gap-3">
                        <button onClick={() => { setShowLibrary(false); setSwapIndex(null); }} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                            <span className="material-symbols-rounded">close</span>
                        </button>
                        <h2 className="font-bold text-lg">{swapIndex !== null ? 'Alterar Exercício' : 'Selecionar Exercício'}</h2>
                        {swapIndex !== null && (
                            <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-medium">
                                Substituindo: {items[swapIndex]?.exercise?.name}
                            </span>
                        )}
                    </div>
                    <div className="p-5 h-[calc(100vh-80px)] overflow-y-auto">
                        <Exercises isModal={true} onSelect={swapIndex !== null ? handleSwapConfirm : handleAddExercise} />
                    </div>
                </div>
            )}

            <WorkoutImportModal
                isOpen={showImport}
                onClose={() => setShowImport(false)}
                onImport={handleImportExercises}
            />

            {editingExercise && (
                <ExerciseFormModal
                    isOpen={!!editingExercise}
                    onClose={() => setEditingExercise(null)}
                    onSave={handleSaveExercise}
                    initialData={editingExercise}
                    loading={saveLoading}
                    isAdmin={false}
                />
            )}

        </MainLayout>
    );
};

export default Editor;