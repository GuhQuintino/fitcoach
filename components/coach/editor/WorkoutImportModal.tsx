import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface WorkoutImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (items: any[]) => void;
}

const WorkoutImportModal: React.FC<WorkoutImportModalProps> = ({ isOpen, onClose, onImport }) => {
    const { user } = useAuth();

    // Steps: 'source' | 'workout' | 'exercises'
    const [step, setStep] = useState<'source' | 'workout' | 'exercises'>('source');

    // Data
    const [routines, setRoutines] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Selection
    const [sourceType, setSourceType] = useState<'template' | 'student'>('template');
    const [selectedRoutine, setSelectedRoutine] = useState<any | null>(null);
    const [selectedWorkout, setSelectedWorkout] = useState<any | null>(null);
    const [availableExercises, setAvailableExercises] = useState<any[]>([]);
    const [selectedExerciseIds, setSelectedExerciseIds] = useState<Set<string>>(new Set());

    // Search
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) {
            resetState();
            fetchSources();
        }
    }, [isOpen, sourceType]);

    const resetState = () => {
        setStep('source');
        setSelectedRoutine(null);
        setSelectedWorkout(null);
        setAvailableExercises([]);
        setSelectedExerciseIds(new Set());
        setSearchTerm('');
    };

    const fetchSources = async () => {
        setLoading(true);
        try {
            if (sourceType === 'template') {
                const { data, error } = await supabase
                    .from('routines')
                    .select('*')
                    .eq('coach_id', user!.id)
                    .eq('is_template', true)
                    .ilike('name', `%${searchTerm}%`)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setRoutines(data || []);
            } else {
                // Fetch students with their active assignments
                // Note: complex query might be needed or just fetch students and filtered locally?
                // Let's fetch students first.
                const { data, error } = await supabase
                    .from('students_data')
                    .select('*, profiles:id(full_name, avatar_url)')
                    .eq('coach_id', user!.id)
                    .ilike('profiles.full_name', `%${searchTerm}%`); // This won't work directly on joined col easily without RPC or specific syntax, let's filter client side if needed or use simple search

                if (error) throw error;

                // For each student, get active routine
                const studentsWithRoutine = await Promise.all((data || []).map(async (s) => {
                    const { data: assignment } = await supabase
                        .from('student_assignments')
                        .select('routine_id, routines(*)')
                        .eq('student_id', s.id)
                        .eq('is_active', true)
                        .maybeSingle(); // Students might not have active routine

                    return {
                        ...s,
                        active_routine: assignment?.routines
                    };
                }));

                setStudents(studentsWithRoutine.filter(s => s.active_routine));
            }
        } catch (error) {
            console.error(error);
            toast.error('Erro ao buscar dados.');
        } finally {
            setLoading(false);
        }
    };

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isOpen) fetchSources();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleSelectRoutine = async (routine: any) => {
        setSelectedRoutine(routine);
        setLoading(true);
        // Fetch workouts for this routine
        try {
            const { data, error } = await supabase
                .from('workouts')
                .select('*')
                .eq('routine_id', routine.id)
                .order('day_number', { ascending: true })
                .order('order_index', { ascending: true });

            if (error) throw error;

            if (data && data.length === 1) {
                // If only 1 workout, skip to exercises step
                handleSelectWorkout(data[0]);
            } else {
                setStep('workout');
                // Store workouts temporarily in a state or just use SWR? 
                // Let's attach them to the selectedRoutine object for simplicity here, or separate state
                setSelectedRoutine({ ...routine, workouts: data });
            }
        } catch (error) {
            toast.error('Erro ao carregar treinos.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectWorkout = async (workout: any) => {
        setSelectedWorkout(workout);
        setLoading(true);
        try {
            // Fetch Items + Sets + Exercise Details (Similar to Editor.tsx)
            const { data, error } = await supabase
                .from('workout_items')
                .select(`
                    *,
                    exercise:exercises(*),
                    sets:workout_sets(*)
                `)
                .eq('workout_id', workout.id)
                .order('order_index');

            if (error) throw error;

            // Sort sets
            const formattedItems = (data || []).map((item: any) => ({
                ...item,
                sets: item.sets.sort((a: any, b: any) => a.set_order - b.set_order)
            }));

            setAvailableExercises(formattedItems);
            // Select all by default
            setSelectedExerciseIds(new Set(formattedItems.map((i: any) => i.id)));
            setStep('exercises');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao carregar exercícios.');
        } finally {
            setLoading(false);
        }
    };

    const toggleExerciseSelection = (itemId: string) => {
        const newSet = new Set(selectedExerciseIds);
        if (newSet.has(itemId)) {
            newSet.delete(itemId);
        } else {
            newSet.add(itemId);
        }
        setSelectedExerciseIds(newSet);
    };

    const handleConfirmImport = () => {
        const itemsToImport = availableExercises.filter(item => selectedExerciseIds.has(item.id));
        onImport(itemsToImport);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl flex flex-col max-h-[85vh] shadow-xl overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                    {step !== 'source' && (
                        <button onClick={() => setStep(step === 'exercises' && selectedRoutine?.workouts?.length > 1 ? 'workout' : 'source')} className="p-1 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
                            <span className="material-symbols-rounded">arrow_back</span>
                        </button>
                    )}
                    <h2 className="font-bold text-lg text-slate-900 dark:text-white flex-1">Importar Treino</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">

                    {/* STEP 1: SOURCE SELECTION */}
                    {step === 'source' && (
                        <div className="space-y-4">
                            {/* Tabs */}
                            <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl mb-4">
                                <button
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${sourceType === 'template' ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
                                    onClick={() => setSourceType('template')}
                                >
                                    Templates
                                </button>
                                <button
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${sourceType === 'student' ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
                                    onClick={() => setSourceType('student')}
                                >
                                    Alunos
                                </button>
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <span className="absolute left-3 top-3 material-symbols-rounded text-slate-400 text-xl">search</span>
                                <input
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder={sourceType === 'template' ? "Buscar rotina..." : "Buscar aluno..."}
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            {/* List */}
                            {loading ? (
                                <div className="py-10 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>
                            ) : (
                                <div className="space-y-2">
                                    {sourceType === 'template' ? (
                                        routines.length === 0 ? (
                                            <p className="text-center text-slate-500 py-8">Nenhuma rotina encontrada.</p>
                                        ) : (
                                            routines.map(routine => (
                                                <button
                                                    key={routine.id}
                                                    onClick={() => handleSelectRoutine(routine)}
                                                    className="w-full text-left p-4 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors group"
                                                >
                                                    <h3 className="font-bold text-slate-900 dark:text-white">{routine.name}</h3>
                                                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                                        <span>{routine.duration_weeks} semanas</span>
                                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                        <span className="group-hover:text-primary transition-colors flex items-center gap-1">
                                                            Selecionar <span className="material-symbols-rounded text-[14px]">arrow_forward</span>
                                                        </span>
                                                    </div>
                                                </button>
                                            ))
                                        )
                                    ) : (
                                        students.length === 0 ? (
                                            <p className="text-center text-slate-500 py-8">Nenhum aluno com treino ativo.</p>
                                        ) : (
                                            students.map(student => (
                                                <button
                                                    key={student.id}
                                                    onClick={() => handleSelectRoutine(student.active_routine)}
                                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors text-left"
                                                >
                                                    <img
                                                        src={student.profiles.avatar_url || `https://ui-avatars.com/api/?name=${student.profiles.full_name}&background=random`}
                                                        className="w-10 h-10 rounded-full bg-slate-200"
                                                    />
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">{student.profiles.full_name}</h3>
                                                        <p className="text-xs text-primary truncate max-w-[200px]">{student.active_routine.name}</p>
                                                    </div>
                                                    <span className="material-symbols-rounded text-slate-400">arrow_forward_ios</span>
                                                </button>
                                            ))
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: WORKOUT SELECTION (If Routine has multiple workouts) */}
                    {step === 'workout' && selectedRoutine && (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-500">Selecione qual treino de <strong>{selectedRoutine.name}</strong> você deseja importar.</p>

                            <div className="space-y-2">
                                {(selectedRoutine.workouts || []).map((w: any) => (
                                    <button
                                        key={w.id}
                                        onClick={() => handleSelectWorkout(w)}
                                        className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                                                {w.day_number || w.order_index}
                                            </div>
                                            <span className="font-bold text-slate-900 dark:text-white">{w.name}</span>
                                        </div>
                                        <span className="material-symbols-rounded text-slate-400">arrow_forward</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: EXERCISE SELECTION (Selective Cloning) */}
                    {step === 'exercises' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm text-slate-500">Selecione os exercícios para importar.</p>
                                <button
                                    onClick={() => {
                                        if (selectedExerciseIds.size === availableExercises.length) setSelectedExerciseIds(new Set());
                                        else setSelectedExerciseIds(new Set(availableExercises.map(e => e.id)));
                                    }}
                                    className="text-primary text-xs font-bold hover:underline"
                                >
                                    {selectedExerciseIds.size === availableExercises.length ? 'Desmarcar todos' : 'Marcar todos'}
                                </button>
                            </div>

                            {loading ? (
                                <div className="py-10 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>
                            ) : availableExercises.length === 0 ? (
                                <p className="text-center text-slate-500 py-10">Este treino não possui exercícios.</p>
                            ) : (
                                <div className="space-y-2">
                                    {availableExercises.map(item => {
                                        const isSelected = selectedExerciseIds.has(item.id);
                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => toggleExerciseSelection(item.id)}
                                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-primary/5 border-primary/50' : 'bg-slate-50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800'}`}
                                            >
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'bg-white border-slate-300'}`}>
                                                    {isSelected && <span className="material-symbols-rounded text-white text-sm">check</span>}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{item.exercise?.name}</h4>
                                                    <p className="text-xs text-slate-500">{item.sets?.length} séries</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* Footer */}
                {step === 'exercises' && (
                    <div className="p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                        <button
                            onClick={handleConfirmImport}
                            disabled={selectedExerciseIds.size === 0}
                            className="w-full py-3 bg-primary disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            Importar {selectedExerciseIds.size} Exercícios
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkoutImportModal;
