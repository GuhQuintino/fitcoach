import React, { useEffect, useState, useRef } from 'react';
import MainLayout from '../../components/Layout/MainLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import ExerciseCard from '../../components/coach/editor/ExerciseCard';
import Exercises from './Exercises'; // Correct component for exercises
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

    // This function will be called by Library when user selects an exercise
    // We need to modify Library to accept an 'onSelect' prop or handle it here via a specialized Library component
    // For now assuming existing Library can work if modified or wrapped.
    // Let's implement a simple handler that we'll pass to the Library (which we will refactor next)
    const handleAddExercise = (exercise: any) => {
        const newItem = {
            id: `temp-${Date.now()}`, // temp ID
            exercise_id: exercise.id,
            exercise: exercise,
            coach_notes: '',
            sets: [
                {
                    id: `temp-set-${Date.now()}`,
                    set_order: 1,
                    type: 'working',
                    reps_target: '10',
                    rest_seconds: '60',
                    rpe_target: '8',
                    weight_target: ''
                }
            ]
        };
        setItems([...items, newItem]);
        setHasUnsavedChanges(true);
        setShowLibrary(false);
    };


    // --- Saving ---
    const handleSave = async (isManual = true) => {
        try {
            if (isManual) setSaving(true);
            else setIsAutoSaving(true);

            // 1. Clean up removed Items
            const currentIds = items.filter(i => !i.id.toString().startsWith('temp')).map(i => i.id);
            if (currentIds.length > 0) {
                // Delete items that are NOT in the current list
                await supabase.from('workout_items').delete().eq('workout_id', workoutId).not('id', 'in', `(${currentIds.join(',')})`);
            } else if (items.length === 0) {
                // If list empty, delete all
                await supabase.from('workout_items').delete().eq('workout_id', workoutId);
            } else {
                // If all items are new (temp ids only), we might still want to delete old items if they existed?
                // In this case, since we don't have existing IDs in our state (maybe we loaded empty?), let's trust the state.
                // But if we loaded existing items and user deleted all of them, currentIds is empty.
                // Wait, if we loaded items, they have real IDs. If user deleted them, they are gone from 'items' state.
                // So currentIds ONLY has real IDs that survived.
                // If currentIds is empty, it means either we started with empty, OR we deleted all real items.
                // So we should delete all items for this workout that are NOT in empty list => Delete All.
                // The check `if (items.length === 0)` covers one case. 
                // But if we have only NEW items, currentIds is empty. But we should still delete OLD items.
                // So: Delete all items where workout_id = ID AND id NOT IN (currentIds).
                // If currentIds empty, delete all.
                if (currentIds.length === 0) {
                    await supabase.from('workout_items').delete().eq('workout_id', workoutId);
                } else {
                    await supabase.from('workout_items').delete().eq('workout_id', workoutId).not('id', 'in', `(${currentIds.join(',')})`);
                }
            }

            // 2. Upsert Items & Sets
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
                if (item.id.toString().startsWith('temp')) {
                    const { data: insertedItem, error: iError } = await supabase
                        .from('workout_items')
                        .insert(itemPayload)
                        .select()
                        .single();
                    if (iError) throw iError;
                    itemId = insertedItem.id; // Capture new real ID
                } else {
                    const { error: uError } = await supabase
                        .from('workout_items')
                        .update(itemPayload)
                        .eq('id', itemId);
                    if (uError) throw uError;
                }

                // B. Sync Sets for this Item
                // First, identify sets to KEEP (real IDs)
                const currentSetIds = item.sets
                    .filter((s: any) => !s.id.toString().startsWith('new') && !s.id.toString().startsWith('temp'))
                    .map((s: any) => s.id);

                // Delete sets that are not in our list for this item
                if (currentSetIds.length === 0) {
                    await supabase.from('workout_sets').delete().eq('workout_item_id', itemId);
                } else {
                    await supabase.from('workout_sets').delete().eq('workout_item_id', itemId).not('id', 'in', `(${currentSetIds.join(',')})`);
                }

                // C. Upsert Sets
                for (let j = 0; j < item.sets.length; j++) {
                    const set = item.sets[j];
                    const setPayload = {
                        workout_item_id: itemId, // IMPORTANT: Use the potentially new itemId
                        set_order: j + 1,
                        type: set.type,
                        reps_target: set.reps_target,
                        rest_seconds: parseInt(set.rest_seconds) || 60,
                        rpe_target: set.rpe_target ? parseFloat(set.rpe_target) : 8,
                        weight_target: set.weight_target ? parseFloat(set.weight_target) : null
                    };

                    if (set.id.toString().startsWith('new') || set.id.toString().startsWith('temp')) {
                        const { error: sInsertError } = await supabase.from('workout_sets').insert(setPayload);
                        if (sInsertError) throw sInsertError;
                    } else {
                        const { error: sUpdateError } = await supabase.from('workout_sets').update(setPayload).eq('id', set.id);
                        if (sUpdateError) throw sUpdateError;
                    }
                }
            }

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
        }
    };

    // Auto-save effect
    useEffect(() => {
        if (!loading && hasUnsavedChanges) {
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
                                <span className="text-[10px] text-sky-500 font-bold flex items-center gap-1 animate-pulse">
                                    <span className="material-symbols-rounded text-[12px]">sync</span>
                                    Salvando...
                                </span>
                            ) : lastSaved ? (
                                <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                                    <span className="material-symbols-rounded text-[12px]">done</span>
                                    Salvo {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => handleSave(true)}
                    disabled={saving || isAutoSaving}
                    className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold px-5 py-2 rounded-xl transition-all disabled:opacity-50 shadow-sm active:scale-95"
                >
                    {saving ? 'Salvando...' : 'Sair e Salvar'}
                </button>
            </header>

            {/* List */}
            <main className="px-5 pt-6 max-w-2xl mx-auto pb-10">
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
                        <button
                            onClick={() => setShowLibrary(true)}
                            className="w-full py-4 rounded-2xl border-2 border-dashed border-primary/30 text-primary font-bold text-lg hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-rounded">add_circle</span>
                            Adicionar Exercício
                        </button>
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

        </MainLayout>
    );
};

export default Editor;