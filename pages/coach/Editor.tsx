import React, { useEffect, useState, useRef } from 'react';
import MainLayout from '../../components/Layout/MainLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import ExerciseCard, { ExerciseItemData } from '../../components/coach/editor/ExerciseCard';
import ExerciseGroupCard, { ExerciseGroupData } from '../../components/coach/editor/ExerciseGroupCard';
import Exercises from './Exercises';
import WorkoutImportModal from '../../components/coach/editor/WorkoutImportModal';
import toast from 'react-hot-toast';
import ExerciseFormModal from '../../components/coach/exercises/ExerciseFormModal';
import MethodGuideModal from '../../components/shared/MethodGuideModal';

export interface WorkoutData {
    id: string;
    name: string;
    routine_id?: string;
    student_id?: string;
    order_index?: number;
    description?: string;
    banner_url?: string;
    routines?: {
        id: string;
        name: string;
    } | null;
}

export interface EditableExercise {
    id: string;
    name: string;
    muscle_group?: string;
    video_url?: string;
    description?: string;
    exercise_type?: 'reps' | 'time' | 'cardio';
    muscle_weights?: Record<string, number>;
}

type DisplayBlock =
    | { type: 'solo'; item: ExerciseItemData; originalIndex: number }
    | { type: 'group'; group: ExerciseGroupData; items: Array<{ item: ExerciseItemData; originalIndex: number }> };

const Editor: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const workoutId = searchParams.get('workout_id');
    const studentId = searchParams.get('student_id');

    const [workout, setWorkout] = useState<WorkoutData | null>(null);
    const [items, setItems] = useState<ExerciseItemData[]>([]);
    const [groups, setGroups] = useState<ExerciseGroupData[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Seleção de agrupamento
    const [isGroupingMode, setIsGroupingMode] = useState(false);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

    // Edição inline de exercícios
    const [editingExercise, setEditingExercise] = useState<EditableExercise | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);

    // Auto-save debounce timer
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
    // Race condition lock
    const isSavingRef = useRef(false);

    // Initial Fetch
    useEffect(() => {
        if (workoutId) fetchWorkoutData();
    }, [workoutId]);

    const fetchWorkoutData = async () => {
        try {
            setLoading(true);
            setItems([]);
            setGroups([]);

            // 1. Fetch workout details + routine name
            const { data: wData, error: wError } = await supabase
                .from('workouts')
                .select(`*, routines (name)`)
                .eq('id', workoutId)
                .single();

            if (wError) throw wError;
            setWorkout(wData);

            // 2. Fetch exercise groups
            const { data: gData, error: gError } = await supabase
                .from('exercise_groups')
                .select('*')
                .eq('workout_id', workoutId)
                .order('group_order');

            if (gError) throw gError;
            setGroups(gData || []);

            // 3. Fetch Items + Sets + Exercise Details
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
            const formattedItems = (iData || []).map((item: any) => ({
                ...item,
                sets: (item.sets || []).sort((a: any, b: any) => a.set_order - b.set_order)
            }));

            setItems(formattedItems);

        } catch (error) {
            console.error('Erro ao carregar dados do treino:', error);
            toast.error('Erro ao carregar treino.');
        } finally {
            setLoading(false);
        }
    };

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
                .eq('id', editingExercise?.id);
            if (error) throw error;

            setItems(prevItems =>
                prevItems.map(item => {
                    if (item.exercise_id === editingExercise?.id) {
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

    // --- State Management ---
    const handleUpdateItem = (index: number, updatedItem: any) => {
        const newItems = [...items];
        newItems[index] = updatedItem;
        setItems(newItems);
        setHasUnsavedChanges(true);
    };

    const handleDeleteItem = async (index: number) => {
        if (!confirm('Remover exercício?')) return;
        const itemToDelete = items[index];
        const newItems = items.filter((_, i) => i !== index);

        // Se o item pertencia a um grupo, verifica se sobrou apenas 1 exercício
        if (itemToDelete?.group_id) {
            const remainingInGroup = newItems.filter(it => it.group_id === itemToDelete.group_id);
            if (remainingInGroup.length < 2) {
                // Desagrupa os restantes
                remainingInGroup.forEach(it => {
                    it.group_id = null;
                    it.group_position = null;
                });
                setGroups(prev => prev.filter(g => g.id !== itemToDelete.group_id));
            }
        }

        setItems(newItems);
        setHasUnsavedChanges(true);
    };

    // --- Grouping Actions ---
    const toggleSelectItem = (itemId: string) => {
        const next = new Set(selectedItemIds);
        if (next.has(itemId)) next.delete(itemId);
        else next.add(itemId);
        setSelectedItemIds(next);
    };

    const handleCreateGroup = (groupType: 'superset' | 'triset' | 'giant_set' | 'paired_antagonist') => {
        if (selectedItemIds.size < 2) {
            toast.error('Selecione pelo menos 2 exercícios para agrupar.');
            return;
        }

        const newGroupId = `temp-group-${Date.now()}`;
        const newGroup: ExerciseGroupData = {
            id: newGroupId,
            workout_id: workoutId || undefined,
            group_type: groupType,
            group_order: groups.length + 1,
            rest_seconds: 90,
            rounds: 3,
            transition_seconds: groupType === 'paired_antagonist' ? 60 : 0,
            coach_notes: null
        };

        let position = 1;
        const newItems = items.map(it => {
            if (selectedItemIds.has(it.id || '')) {
                const updated = {
                    ...it,
                    group_id: newGroupId,
                    group_position: position
                };
                position++;
                return updated;
            }
            return it;
        });

        setGroups(prev => [...prev, newGroup]);
        setItems(newItems);
        setSelectedItemIds(new Set());
        setIsGroupingMode(false);
        setHasUnsavedChanges(true);
        toast.success(`Grupo ${groupType.toUpperCase()} criado!`, { icon: '🔗' });
    };

    const handleUngroup = (groupId: string) => {
        setItems(prev => prev.map(it => {
            if (it.group_id === groupId) {
                return { ...it, group_id: null, group_position: null };
            }
            return it;
        }));
        setGroups(prev => prev.filter(g => g.id !== groupId));
        setHasUnsavedChanges(true);
        toast.success('Exercícios desagrupados.');
    };

    const handleUpdateGroup = (updatedGroup: ExerciseGroupData) => {
        setGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
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

    // --- Adding / Swapping Exercise ---
    const [showLibrary, setShowLibrary] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [swapIndex, setSwapIndex] = useState<number | null>(null);

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

    const handleAddExercise = (exercisesData: any | any[]) => {
        const exercisesToAdd = Array.isArray(exercisesData) ? exercisesData : [exercisesData];

        const newItemsToAdd = exercisesToAdd.map((exercise: any) => {
            const exerciseType = exercise.exercise_type || 'reps';
            let initialSet: any = {
                id: `temp-set-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                set_order: 1,
                type: 'working',
                rest_seconds: '60',
                rpe_target: '8',
                set_method: 'standard',
                execution_mode: 'standard',
                timer_mode: 'standard'
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
                    time_target: '60'
                };
            }

            return {
                id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                exercise_id: exercise.id,
                exercise: exercise,
                coach_notes: '',
                group_id: null,
                group_position: null,
                sets: [initialSet]
            };
        });

        setItems(prev => [...prev, ...newItemsToAdd]);
        setHasUnsavedChanges(true);
        setShowLibrary(false);
    };

    const handleImportExercises = (importedItems: any[]) => {
        // Mapeia agrupamentos importados para novos IDs temporários
        const importedGroupMap = new Map<string, string>();

        const newItemsToAdd = importedItems.map((item: any) => {
            let newGroupId: string | null = null;
            if (item.group_id) {
                if (!importedGroupMap.has(item.group_id)) {
                    const freshGroupId = `temp-group-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                    importedGroupMap.set(item.group_id, freshGroupId);
                    // Adiciona o novo grupo se não existir
                    const importedGroup = item.exercise_groups || {
                        group_type: 'superset',
                        rest_seconds: 90,
                        rounds: 3,
                        transition_seconds: 0,
                        coach_notes: null
                    };
                    setGroups(prev => [
                        ...prev,
                        {
                            id: freshGroupId,
                            workout_id: workoutId || undefined,
                            group_type: importedGroup.group_type || 'superset',
                            group_order: prev.length + 1,
                            rest_seconds: importedGroup.rest_seconds || 90,
                            rounds: importedGroup.rounds || 3,
                            transition_seconds: importedGroup.transition_seconds || 0,
                            coach_notes: importedGroup.coach_notes || null
                        }
                    ]);
                }
                newGroupId = importedGroupMap.get(item.group_id) || null;
            }

            return {
                id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                exercise_id: item.exercise_id,
                exercise: item.exercise,
                coach_notes: item.coach_notes || '',
                group_id: newGroupId,
                group_position: item.group_position || null,
                sets: (item.sets || []).map((s: any) => ({
                    id: `temp-set-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    set_order: s.set_order,
                    type: s.type || 'working',
                    reps_target: s.reps_target,
                    rest_seconds: s.rest_seconds,
                    rpe_target: s.rpe_target,
                    weight_target: s.weight_target,
                    time_target: s.time_target,
                    distance_target: s.distance_target,
                    speed_target: s.speed_target,
                    hiit_work_seconds: s.hiit_work_seconds,
                    hiit_rest_seconds: s.hiit_rest_seconds,
                    hiit_work_speed: s.hiit_work_speed,
                    hiit_rest_speed: s.hiit_rest_speed,
                    hiit_cycles: s.hiit_cycles,
                    set_method: s.set_method || 'standard',
                    micro_rest_seconds: s.micro_rest_seconds,
                    execution_mode: s.execution_mode || 'standard',
                    tempo: s.tempo,
                    timer_mode: s.timer_mode || 'standard',
                    drop_count: s.drop_count,
                    sub_sets: s.sub_sets,
                    activation_reps: s.activation_reps
                }))
            };
        });

        setItems(prev => [...prev, ...newItemsToAdd]);
        setHasUnsavedChanges(true);
    };

    const handleMoveItem = (fromIndex: number, toIndex: number) => {
        if (toIndex < 0 || toIndex >= items.length) return;
        setItems(prevItems => {
            const newItems = [...prevItems];
            const [moved] = newItems.splice(fromIndex, 1);
            newItems.splice(toIndex, 0, moved);
            return newItems.map((it, idx) => ({ ...it, order_index: idx }));
        });
        setHasUnsavedChanges(true);
        toast.success(`Exercício movido para a posição ${toIndex + 1}`, { duration: 1500 });
    };

    // --- Persistência em 4 Fases (handleSave) ---
    const handleSave = async (isManual = true) => {
        if (isSavingRef.current) return;

        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
        }

        try {
            isSavingRef.current = true;
            if (isManual) setSaving(true);
            else setIsAutoSaving(true);

            // ═════════════════════════════════════════════════════════════════
            // FASE 1: PERSISTÊNCIA DE EXERCISE_GROUPS
            // ═════════════════════════════════════════════════════════════════
            const currentGroupDbIds = groups.filter(g => !g.id.startsWith('temp')).map(g => g.id);
            if (currentGroupDbIds.length > 0) {
                await supabase.from('exercise_groups').delete().eq('workout_id', workoutId).not('id', 'in', `(${currentGroupDbIds.join(',')})`);
            } else {
                await supabase.from('exercise_groups').delete().eq('workout_id', workoutId);
            }

            const groupsToUpdate = groups
                .filter(g => !g.id.startsWith('temp'))
                .map((g, idx) => ({
                    id: g.id,
                    workout_id: workoutId,
                    group_type: g.group_type,
                    group_order: idx + 1,
                    rest_seconds: g.rest_seconds,
                    rounds: g.rounds,
                    transition_seconds: g.transition_seconds,
                    coach_notes: g.coach_notes
                }));

            const groupsToInsert = groups
                .filter(g => g.id.startsWith('temp'))
                .map((g, idx) => ({
                    workout_id: workoutId,
                    group_type: g.group_type,
                    group_order: groups.indexOf(g) + 1,
                    rest_seconds: g.rest_seconds,
                    rounds: g.rounds,
                    transition_seconds: g.transition_seconds,
                    coach_notes: g.coach_notes
                }));

            const groupIdMap = new Map<string, string>();
            const dbGroupsSaved: any[] = [];

            if (groupsToUpdate.length > 0) {
                const { data: dbGUpdates, error: gUpError } = await supabase
                    .from('exercise_groups')
                    .upsert(groupsToUpdate)
                    .select();
                if (gUpError) throw gUpError;
                dbGroupsSaved.push(...(dbGUpdates || []));
            }

            if (groupsToInsert.length > 0) {
                const { data: dbGInserts, error: gInError } = await supabase
                    .from('exercise_groups')
                    .insert(groupsToInsert)
                    .select();
                if (gInError) throw gInError;
                dbGroupsSaved.push(...(dbGInserts || []));
            }

            // Mapeia IDs temporários de grupo para os UUIDs reais retornados
            groups.forEach((lg, idx) => {
                if (lg.id.startsWith('temp')) {
                    const matchedDbGroup = dbGroupsSaved.find((dg: any) => dg.group_order === idx + 1);
                    if (matchedDbGroup) {
                        groupIdMap.set(lg.id, matchedDbGroup.id);
                    }
                }
            });

            // ═════════════════════════════════════════════════════════════════
            // FASE 2: PERSISTÊNCIA DE WORKOUT_ITEMS (com group_id mapeado)
            // ═════════════════════════════════════════════════════════════════
            const currentItemDbIds = items.filter(i => !i.id?.toString().startsWith('temp') && !i.id?.toString().startsWith('loaded')).map(i => i.id);
            if (currentItemDbIds.length > 0) {
                await supabase.from('workout_items').delete().eq('workout_id', workoutId).not('id', 'in', `(${currentItemDbIds.join(',')})`);
            } else {
                await supabase.from('workout_items').delete().eq('workout_id', workoutId);
            }

            const itemsToUpdate = items
                .filter(item => !item.id?.toString().startsWith('temp') && !item.id?.toString().startsWith('loaded'))
                .map((item, i) => {
                    const realGroupId = item.group_id ? (groupIdMap.get(item.group_id) || item.group_id) : null;
                    return {
                        id: item.id,
                        workout_id: workoutId,
                        exercise_id: item.exercise_id,
                        order_index: i + 1,
                        coach_notes: item.coach_notes,
                        group_id: realGroupId,
                        group_position: item.group_position || null
                    };
                });

            const itemsToInsert = items
                .filter(item => item.id?.toString().startsWith('temp') || item.id?.toString().startsWith('loaded'))
                .map((item) => {
                    const realGroupId = item.group_id ? (groupIdMap.get(item.group_id) || item.group_id) : null;
                    return {
                        workout_id: workoutId,
                        exercise_id: item.exercise_id,
                        order_index: items.indexOf(item) + 1,
                        coach_notes: item.coach_notes,
                        group_id: realGroupId,
                        group_position: item.group_position || null
                    };
                });

            const itemIdMap = new Map<string, string>();
            const dbItemsSaved: any[] = [];

            if (itemsToUpdate.length > 0) {
                const { data: dbUpdates, error: itemsError } = await supabase
                    .from('workout_items')
                    .upsert(itemsToUpdate)
                    .select();
                if (itemsError) throw itemsError;
                dbItemsSaved.push(...(dbUpdates || []));
            }

            if (itemsToInsert.length > 0) {
                const { data: dbInserts, error: itemsError } = await supabase
                    .from('workout_items')
                    .insert(itemsToInsert)
                    .select();
                if (itemsError) throw itemsError;
                dbItemsSaved.push(...(dbInserts || []));
            }

            dbItemsSaved.forEach((dbItem: any) => {
                const localItem = items.find((li, idx) => li.exercise_id === dbItem.exercise_id && idx === dbItem.order_index - 1);
                if (localItem && localItem.id) {
                    itemIdMap.set(localItem.id, dbItem.id);
                }
            });

            // ═════════════════════════════════════════════════════════════════
            // FASE 3: PERSISTÊNCIA DE WORKOUT_SETS (com todos os novos campos)
            // ═════════════════════════════════════════════════════════════════
            const setsToUpdate: any[] = [];
            const setsToInsert: any[] = [];
            const activeSetIds: string[] = [];
            const workoutItemIdsInUse: string[] = [];

            items.forEach((item) => {
                const realItemId = (item.id ? itemIdMap.get(item.id) : null) || item.id;
                if (!realItemId) return;
                workoutItemIdsInUse.push(realItemId);

                item.sets.forEach((set: any, j: number) => {
                    const payload: any = {
                        workout_item_id: realItemId,
                        set_order: j + 1,
                        order_index: j + 1,
                        type: set.type === 'dropset' ? 'drop' : set.type,
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
                        hiit_cycles: set.hiit_cycles ? parseInt(set.hiit_cycles) : null,
                        // Novas colunas ortogonais:
                        set_method: set.set_method || 'standard',
                        micro_rest_seconds: set.micro_rest_seconds ? parseInt(set.micro_rest_seconds) : null,
                        execution_mode: set.execution_mode || 'standard',
                        tempo: set.tempo || null,
                        timer_mode: set.timer_mode || 'standard',
                        drop_count: set.drop_count ? parseInt(set.drop_count) : null,
                        sub_sets: set.sub_sets ? parseInt(set.sub_sets) : null,
                        activation_reps: set.activation_reps ? parseInt(set.activation_reps) : null
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

            // Exclui séries órfãs
            if (workoutItemIdsInUse.length > 0) {
                let deleteQuery = supabase.from('workout_sets').delete().in('workout_item_id', workoutItemIdsInUse);
                if (activeSetIds.length > 0) {
                    deleteQuery = deleteQuery.not('id', 'in', `(${activeSetIds.join(',')})`);
                }
                const { error: deleteError } = await deleteQuery;
                if (deleteError) throw deleteError;
            }

            const dbSetsSaved: any[] = [];

            if (setsToUpdate.length > 0) {
                const { data: dbUpdates, error: setsError } = await supabase
                    .from('workout_sets')
                    .upsert(setsToUpdate)
                    .select();
                if (setsError) throw setsError;
                dbSetsSaved.push(...(dbUpdates || []));
            }

            if (setsToInsert.length > 0) {
                const { data: dbInserts, error: setsError } = await supabase
                    .from('workout_sets')
                    .insert(setsToInsert)
                    .select();
                if (setsError) throw setsError;
                dbSetsSaved.push(...(dbInserts || []));
            }

            const setIdMap = new Map<string, string>();
            dbSetsSaved.forEach((dbSet: any) => {
                const localItem = items.find(li => ((li.id ? itemIdMap.get(li.id) : null) || li.id) === dbSet.workout_item_id);
                if (localItem) {
                    const localSet = localItem.sets.find((ls: any) => ls.set_order === dbSet.set_order);
                    if (localSet && (localSet.id.toString().startsWith('new') || localSet.id.toString().startsWith('temp') || localSet.id.toString().startsWith('loaded'))) {
                        setIdMap.set(localSet.id, dbSet.id);
                    }
                }
            });

            // ═════════════════════════════════════════════════════════════════
            // FASE 4: SINCRONIZAÇÃO DE ESTADO LOCAL COM NOVOS UUIDS
            // ═════════════════════════════════════════════════════════════════
            setGroups(currentGroups => {
                return currentGroups.map(g => {
                    const newGId = groupIdMap.get(g.id) || g.id;
                    return { ...g, id: newGId };
                });
            });

            setItems(currentItems => {
                return currentItems.map(item => {
                    const newItemId = (item.id ? itemIdMap.get(item.id) : null) || item.id;
                    const newGroupId = item.group_id ? (groupIdMap.get(item.group_id) || item.group_id) : null;
                    const newSets = item.sets.map((set: any) => ({
                        ...set,
                        id: setIdMap.get(set.id) || set.id,
                        workout_item_id: newItemId
                    }));

                    return {
                        ...item,
                        id: newItemId,
                        group_id: newGroupId,
                        sets: newSets
                    };
                });
            });

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
        if (!loading && hasUnsavedChanges && !isSavingRef.current) {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

            saveTimerRef.current = setTimeout(() => {
                handleSave(false);
            }, 3000);
        }

        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [items, groups, hasUnsavedChanges, loading]);

    // Prevenção de fechamento acidental
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

    // ═════════════════════════════════════════════════════════════════
    // ESTRUTURAÇÃO DE BLOCOS DE EXIBIÇÃO (Grupos vs. Itens Solo)
    // ═════════════════════════════════════════════════════════════════
    const displayBlocks: DisplayBlock[] = [];
    const processedGroupIds = new Set<string>();

    items.forEach((item, index) => {
        if (item.group_id) {
            if (!processedGroupIds.has(item.group_id)) {
                processedGroupIds.add(item.group_id);
                const matchedGroup = groups.find(g => g.id === item.group_id) || {
                    id: item.group_id,
                    workout_id: workoutId || undefined,
                    group_type: 'superset',
                    group_order: displayBlocks.length + 1,
                    rest_seconds: 90,
                    rounds: 3,
                    transition_seconds: 0,
                    coach_notes: null
                };

                const groupItems = items
                    .map((it, idx) => ({ item: it, originalIndex: idx }))
                    .filter(entry => entry.item.group_id === item.group_id)
                    .sort((a, b) => (a.item.group_position || 0) - (b.item.group_position || 0));

                displayBlocks.push({
                    type: 'group',
                    group: matchedGroup,
                    items: groupItems
                });
            }
        } else {
            displayBlocks.push({
                type: 'solo',
                item,
                originalIndex: index
            });
        }
    });

    return (
        <MainLayout>
            {/* Header */}
            <header className="w-full px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-30 border-b border-slate-100 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleBack}
                        aria-label="Voltar para a rotina"
                        className="w-11 h-11 min-w-[44px] min-h-[44px] -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center text-slate-500 dark:text-slate-400 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                        <span className="material-symbols-rounded" aria-hidden="true">arrow_back</span>
                    </button>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{workout?.routines?.name}</p>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-bold text-slate-900 dark:text-white font-display leading-tight">{workout?.name || 'Editor'}</h1>
                            {isAutoSaving ? (
                                <span className="bg-sky-50 dark:bg-sky-900/20 text-sky-500 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse border border-sky-100 dark:border-sky-500/20">
                                    <span className="material-symbols-rounded text-[12px]" aria-hidden="true">sync</span>
                                    Salvando
                                </span>
                            ) : lastSaved ? (
                                <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-100 dark:border-emerald-500/20">
                                    <span className="material-symbols-rounded text-[12px]" aria-hidden="true">done</span>
                                    Sincronizado {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Botão de Toggle do Modo de Agrupamento */}
                    <button
                        type="button"
                        onClick={() => {
                            setIsGroupingMode(!isGroupingMode);
                            setSelectedItemIds(new Set());
                        }}
                        className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                            isGroupingMode
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
                        }`}
                        title="Agrupar exercícios em Biset, Triset ou Giant Set"
                    >
                        <span className="material-symbols-rounded text-base" aria-hidden="true">link</span>
                        <span className="hidden sm:inline">{isGroupingMode ? 'Cancelar Seleção' : 'Agrupar (Biset)'}</span>
                        <span className="sm:hidden">{isGroupingMode ? 'Cancelar' : 'Agrupar'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSave(true)}
                        disabled={saving}
                        className="min-h-[40px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold px-5 py-2 rounded-xl transition-all disabled:opacity-50 shadow-md hover:shadow-glow active:scale-95 text-xs sm:text-sm"
                    >
                        {saving ? 'Salvando...' : 'Sair e Salvar'}
                    </button>
                </div>
            </header>

            {/* Floating Action Bar quando em Modo de Agrupamento */}
            {isGroupingMode && (
                <div className="sticky top-[73px] z-20 bg-indigo-600 text-white p-3 shadow-lg border-b border-indigo-700 animate-slide-down flex items-center justify-between flex-wrap gap-2 px-4 sm:px-8">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-rounded text-xl" aria-hidden="true">checklist</span>
                        <span className="text-xs sm:text-sm font-bold">
                            {selectedItemIds.size === 0
                                ? 'Marque os exercícios que deseja executar juntos:'
                                : `${selectedItemIds.size} exercício(s) selecionado(s)`}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {selectedItemIds.size === 2 && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => handleCreateGroup('superset')}
                                    className="px-3 py-1.5 bg-white text-indigo-700 font-bold text-xs rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-1 shadow-xs"
                                >
                                    <span className="material-symbols-rounded text-sm" aria-hidden="true">dynamic_feed</span>
                                    Criar Biset
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleCreateGroup('paired_antagonist')}
                                    className="px-3 py-1.5 bg-white text-indigo-700 font-bold text-xs rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-1 shadow-xs"
                                >
                                    <span className="material-symbols-rounded text-sm" aria-hidden="true">swap_horiz</span>
                                    Criar Antagonista
                                </button>
                            </>
                        )}
                        {selectedItemIds.size === 3 && (
                            <button
                                type="button"
                                onClick={() => handleCreateGroup('triset')}
                                className="px-3 py-1.5 bg-white text-indigo-700 font-bold text-xs rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-1 shadow-xs"
                            >
                                <span className="material-symbols-rounded text-sm" aria-hidden="true">view_carousel</span>
                                Criar Triset
                            </button>
                        )}
                        {selectedItemIds.size >= 4 && (
                            <button
                                type="button"
                                onClick={() => handleCreateGroup('giant_set')}
                                className="px-3 py-1.5 bg-white text-indigo-700 font-bold text-xs rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-1 shadow-xs"
                            >
                                <span className="material-symbols-rounded text-sm" aria-hidden="true">table_rows</span>
                                Criar Giant Set
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                setIsGroupingMode(false);
                                setSelectedItemIds(new Set());
                            }}
                            className="px-2.5 py-1.5 text-xs text-indigo-100 hover:text-white transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="w-full overflow-x-hidden px-2 sm:px-5 pt-6 max-w-2xl mx-auto pb-10">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-slate-500 font-medium">
                        {items.length} exercícios {groups.length > 0 && `• ${groups.length} grupo(s)`}
                    </p>
                </div>

                {loading ? (
                    <div className="space-y-4 animate-pulse">
                        <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                        <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {displayBlocks.map((block, blockIdx) => {
                            if (block.type === 'group') {
                                return (
                                    <ExerciseGroupCard
                                        key={block.group.id}
                                        group={block.group}
                                        items={block.items.map(entry => entry.item)}
                                        onUpdateGroup={handleUpdateGroup}
                                        onUngroup={() => handleUngroup(block.group.id)}
                                        onUpdateItem={(innerIdx, updated) => {
                                            const originalIdx = block.items[innerIdx]?.originalIndex;
                                            if (originalIdx !== undefined) handleUpdateItem(originalIdx, updated);
                                        }}
                                        onDeleteItem={(innerIdx) => {
                                            const originalIdx = block.items[innerIdx]?.originalIndex;
                                            if (originalIdx !== undefined) handleDeleteItem(originalIdx);
                                        }}
                                        onSwapExercise={(innerIdx) => {
                                            const originalIdx = block.items[innerIdx]?.originalIndex;
                                            if (originalIdx !== undefined) handleSwapExercise(originalIdx);
                                        }}
                                        onEditExercise={(innerIdx) => {
                                            const originalIdx = block.items[innerIdx]?.originalIndex;
                                            if (originalIdx !== undefined) setEditingExercise(items[originalIdx]?.exercise);
                                        }}
                                        studentId={studentId}
                                    />
                                );
                            }

                            // Solo Item
                            const isSelectedForGroup = selectedItemIds.has(block.item.id || '');

                            return (
                                <div
                                    key={block.item.id || block.originalIndex}
                                    draggable={!isGroupingMode}
                                    onDragStart={(e) => handleDragStart(e, block.originalIndex)}
                                    onDragEnter={(e) => handleDragEnter(e, block.originalIndex)}
                                    onDragEnd={handleDragEnd}
                                    className="transition-all relative"
                                >
                                    {/* Checkbox overlay quando em Modo de Agrupamento */}
                                    {isGroupingMode && (
                                        <div
                                            onClick={() => toggleSelectItem(block.item.id || '')}
                                            className={`mb-2 p-2.5 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                                                isSelectedForGroup
                                                    ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-600 text-indigo-700 dark:text-indigo-300'
                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                            }`}
                                        >
                                            <span className="text-xs font-bold">
                                                {isSelectedForGroup ? '✓ Selecionado para o Grupo' : 'Clique para selecionar este exercício'}
                                            </span>
                                            <input
                                                type="checkbox"
                                                checked={isSelectedForGroup}
                                                onChange={() => toggleSelectItem(block.item.id || '')}
                                                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                                            />
                                        </div>
                                    )}

                                    <ExerciseCard
                                        item={block.item}
                                        index={block.originalIndex}
                                        totalItems={items.length}
                                        studentId={studentId}
                                        onUpdate={(updated) => handleUpdateItem(block.originalIndex, updated)}
                                        onDelete={() => handleDeleteItem(block.originalIndex)}
                                        onMoveUp={() => handleMoveItem(block.originalIndex, block.originalIndex - 1)}
                                        onMoveDown={() => handleMoveItem(block.originalIndex, block.originalIndex + 1)}
                                        onSwapExercise={() => handleSwapExercise(block.originalIndex)}
                                        onEditExercise={() => setEditingExercise(block.item.exercise)}
                                    />
                                </div>
                            );
                        })}

                        {/* Relative Footer Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setShowImport(true)}
                                aria-label="Importar exercícios de outro treino"
                                className="w-full min-h-[56px] py-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex flex-col items-center justify-center gap-1"
                            >
                                <span className="material-symbols-rounded" aria-hidden="true">download</span>
                                <span className="text-sm">Importar</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowLibrary(true)}
                                aria-label="Adicionar novo exercício à rotina"
                                className="w-full min-h-[56px] py-4 rounded-2xl border-2 border-dashed border-primary/30 text-primary font-bold hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-1"
                            >
                                <span className="material-symbols-rounded" aria-hidden="true">add_circle</span>
                                <span className="text-sm">Adicionar</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Library Modal Overlay */}
            {showLibrary && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={swapIndex !== null ? 'Alterar Exercício' : 'Selecionar Exercício'}
                    className="fixed inset-0 z-[60] bg-white dark:bg-slate-900 overflow-auto"
                >
                    <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-4 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => { setShowLibrary(false); setSwapIndex(null); }}
                            aria-label="Fechar seleção de exercícios"
                            className="min-w-[44px] min-h-[44px] p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        >
                            <span className="material-symbols-rounded" aria-hidden="true">close</span>
                        </button>
                        <h2 className="font-bold text-lg text-slate-900 dark:text-white">{swapIndex !== null ? 'Alterar Exercício' : 'Selecionar Exercício'}</h2>
                        {swapIndex !== null && (
                            <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
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