import React, { useEffect, useState, useRef } from 'react';
import MainLayout from '../../components/Layout/MainLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import ExerciseCard from '../../components/coach/editor/ExerciseCard';
import Exercises from './Exercises'; // Correct component for exercises
import WorkoutImportModal from '../../components/coach/editor/WorkoutImportModal';
import toast from 'react-hot-toast';

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

    // This function will be called by Library when user selects an exercise
    // We need to modify Library to accept an 'onSelect' prop or handle it here via a specialized Library component
    // For now assuming existing Library can work if modified or wrapped.
    // Let's implement a simple handler that we'll pass to the Library (which we will refactor next)
    // Let's implement a simple handler that we'll pass to the Library (which we will refactor next)
    const handleAddExercise = (exercisesData: any | any[]) => {
        // Normalize to array
        const exercisesToAdd = Array.isArray(exercisesData) ? exercisesData : [exercisesData];

        const newItemsToAdd = exercisesToAdd.map((exercise: any) => ({
            id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // unique temp ID
            exercise_id: exercise.id,
            exercise: exercise,
            coach_notes: '',
            sets: [
                {
                    id: `temp-set-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    set_order: 1,
                    type: 'working',
                    reps_target: '10',
                    rest_seconds: '60',
                    rpe_target: '8',
                    weight_target: ''
                }
            ]
        }));

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
                // Don't copy id, workout_item_id, etc.
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
            } else if (items.length === 0) {
                // If list empty, delete all
                await supabase.from('workout_items').delete().eq('workout_id', workoutId);
            } else {
                if (currentIds.length === 0) {
                    await supabase.from('workout_items').delete().eq('workout_id', workoutId);
                } else {
                    await supabase.from('workout_items').delete().eq('workout_id', workoutId).not('id', 'in', `(${currentIds.join(',')})`);
                }
            }

            // 2. Upsert Items & Sets - FULLY SEQUENTIAL (required for Supabase Free Tier stability)
            const itemIdMap = new Map<string, string>();
            const setIdMap = new Map<string, string>();

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                let itemId = item.id;

                const itemPayload = {
                    workout_id: workoutId,
                    exercise_id: item.exercise_id,
                    order_index: i + 1,
                    coach_notes: item.coach_notes
                };

                // A. Insert/Update Item
                if (item.id.toString().startsWith('temp') || item.id.toString().startsWith('loaded')) {
                    const { data: insertedItem, error: iError } = await supabase
                        .from('workout_items')
                        .insert(itemPayload)
                        .select()
                        .single();
                    if (iError) throw iError;
                    itemIdMap.set(item.id, insertedItem.id);
                    itemId = insertedItem.id;
                } else {
                    const { error: uError } = await supabase
                        .from('workout_items')
                        .update(itemPayload)
                        .eq('id', itemId);
                    if (uError) throw uError;
                }

                // B. Sync Sets for this Item
                const currentSetIds = item.sets
                    .filter((s: any) => !s.id.toString().startsWith('new') && !s.id.toString().startsWith('temp') && !s.id.toString().startsWith('loaded'))
                    .map((s: any) => s.id);

                if (currentSetIds.length === 0) {
                    await supabase.from('workout_sets').delete().eq('workout_item_id', itemId);
                } else {
                    await supabase.from('workout_sets').delete().eq('workout_item_id', itemId).not('id', 'in', `(${currentSetIds.join(',')})`);
                }

                // C. Upsert Sets - One by one
                for (let j = 0; j < item.sets.length; j++) {
                    const set = item.sets[j];
                    const setPayload = {
                        workout_item_id: itemId,
                        set_order: j + 1,
                        order_index: j + 1,
                        type: set.type,
                        reps_target: set.reps_target,
                        rest_seconds: parseInt(set.rest_seconds) || 60,
                        rpe_target: set.rpe_target ? parseFloat(set.rpe_target) : 8,
                        weight_target: set.weight_target ? parseFloat(set.weight_target) : null
                    };

                    if (set.id.toString().startsWith('new') || set.id.toString().startsWith('temp') || set.id.toString().startsWith('loaded')) {
                        const { data: insertedSet, error: sInsertError } = await supabase
                            .from('workout_sets')
                            .insert(setPayload)
                            .select()
                            .single();
                        if (sInsertError) throw sInsertError;
                        setIdMap.set(set.id, insertedSet.id);
                    } else {
                        const { error: sUpdateError } = await supabase.from('workout_sets').update(setPayload).eq('id', set.id);
                        if (sUpdateError) throw sUpdateError;
                    }
                }
            }



            // Sync state with new IDs functionally
            // This preserves items added by the user while the save was in progress
            setItems(currentItems => {
                return currentItems.map(item => {
                    // Update Item ID if it was just saved (temp -> real)
                    const newItemId = itemIdMap.get(item.id) || item.id;

                    // Update Set IDs
                    const newSets = item.sets.map((set: any) => ({
                        ...set,
                        id: setIdMap.get(set.id) || set.id,
                        workout_item_id: newItemId // Ensure consistency
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
            setIsAutoSaving(false);
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
                        <button onClick={() => setShowLibrary(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                            <span className="material-symbols-rounded">close</span>
                        </button>
                        <h2 className="font-bold text-lg">Selecionar Exercício</h2>
                    </div>
                    {/* 
                        Uses new Exercises component in modal mode
                    */}
                    <div className="p-5 h-[calc(100vh-80px)] overflow-y-auto">
                        <Exercises isModal={true} onSelect={handleAddExercise} />
                    </div>
                </div>
            )}

            <WorkoutImportModal
                isOpen={showImport}
                onClose={() => setShowImport(false)}
                onImport={handleImportExercises}
            />

        </MainLayout>
    );
};

export default Editor;