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
    const [, setSelectedWorkout] = useState<any | null>(null);
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
                // 1. Buscar alunos do coach em uma única query
                const { data: studentsData, error: studentsError } = await supabase
                    .from('students_data')
                    .select('*, profiles:id(full_name, avatar_url)')
                    .eq('coach_id', user!.id);

                if (studentsError) throw studentsError;

                const normalizedQuery = searchTerm.trim().toLowerCase();
                const filteredStudents = (studentsData || []).filter((s: any) => {
                    if (!normalizedQuery) return true;
                    const fullName = String(s.profiles?.full_name || '').toLowerCase();
                    return fullName.includes(normalizedQuery);
                });

                if (filteredStudents.length === 0) {
                    setStudents([]);
                    return;
                }

                // 2. Buscar todas as atribuições ativas em lote único (.in) sem queries N+1
                const studentIds = filteredStudents.map((s: any) => s.id);
                const { data: assignmentsData, error: assignmentsError } = await supabase
                    .from('student_assignments')
                    .select('student_id, routine_id, routines(*)')
                    .in('student_id', studentIds)
                    .eq('is_active', true);

                if (assignmentsError) throw assignmentsError;

                const assignmentByStudentId = new Map<string, any>();
                (assignmentsData || []).forEach((assignment: any) => {
                    if (assignment.student_id && assignment.routines) {
                        assignmentByStudentId.set(assignment.student_id, assignment.routines);
                    }
                });

                const studentsWithRoutine = filteredStudents
                    .map((s: any) => ({
                        ...s,
                        active_routine: assignmentByStudentId.get(s.id) || null
                    }))
                    .filter((s: any) => Boolean(s.active_routine));

                setStudents(studentsWithRoutine);
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
            const [itemsRes, groupsRes] = await Promise.all([
                supabase
                    .from('workout_items')
                    .select(`
                        *,
                        exercise:exercises(*),
                        sets:workout_sets(*)
                    `)
                    .eq('workout_id', workout.id)
                    .order('order_index'),
                supabase
                    .from('exercise_groups')
                    .select('*')
                    .eq('workout_id', workout.id)
                    .order('group_order')
            ]);

            if (itemsRes.error) throw itemsRes.error;

            const groupsData = groupsRes.data || [];
            // Sort sets and attach exercise_groups
            const formattedItems = (itemsRes.data || []).map((item: any) => ({
                ...item,
                exercise_groups: groupsData.find((g: any) => g.id === item.group_id) || null,
                sets: (item.sets || []).sort((a: any, b: any) => a.set_order - b.set_order)
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
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Importar Treino"
            className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70 animate-fade-in"
        >
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl flex flex-col max-h-[85vh] shadow-xl overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                    {step !== 'source' && (
                        <button
                            type="button"
                            onClick={() => setStep(step === 'exercises' && selectedRoutine?.workouts?.length > 1 ? 'workout' : 'source')}
                            aria-label="Voltar para a etapa anterior"
                            className="min-w-[44px] min-h-[44px] p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            <span className="material-symbols-rounded" aria-hidden="true">arrow_back</span>
                        </button>
                    )}
                    <h2 className="font-bold text-lg text-slate-900 dark:text-white flex-1">Importar Treino</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar janela de importação"
                        className="min-w-[44px] min-h-[44px] p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <span className="material-symbols-rounded" aria-hidden="true">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">

                    {/* STEP 1: SOURCE SELECTION */}
                    {step === 'source' && (
                        <div className="space-y-4">
                            {/* Tabs */}
                            <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl mb-4" role="tablist">
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={sourceType === 'template'}
                                    className={`flex-1 min-h-[44px] py-2 rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${sourceType === 'template' ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}
                                    onClick={() => setSourceType('template')}
                                >
                                    Templates
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={sourceType === 'student'}
                                    className={`flex-1 min-h-[44px] py-2 rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${sourceType === 'student' ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}
                                    onClick={() => setSourceType('student')}
                                >
                                    Alunos
                                </button>
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <span className="absolute left-3 top-3.5 material-symbols-rounded text-slate-400 text-xl" aria-hidden="true">search</span>
                                <input
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white min-h-[44px]"
                                    placeholder={sourceType === 'template' ? "Buscar rotina..." : "Buscar aluno..."}
                                    aria-label={sourceType === 'template' ? "Buscar rotina por nome" : "Buscar aluno por nome"}
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            {/* List */}
                            {loading ? (
                                <div className="py-10 text-center flex flex-col items-center justify-center gap-2" role="status" aria-live="polite">
                                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                                    <span className="sr-only">Carregando rotinas e alunos disponíveis...</span>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {sourceType === 'template' ? (
                                        routines.length === 0 ? (
                                            <p className="text-center text-slate-600 dark:text-slate-300 py-8">Nenhuma rotina encontrada.</p>
                                        ) : (
                                            routines.map(routine => (
                                                <button
                                                    key={routine.id}
                                                    type="button"
                                                    onClick={() => handleSelectRoutine(routine)}
                                                    className="w-full min-h-[44px] text-left p-4 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                                >
                                                    <h3 className="font-bold text-slate-900 dark:text-white">{routine.name}</h3>
                                                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-2">
                                                        <span className="tabular-nums">{routine.duration_weeks} semanas</span>
                                                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                                        <span className="group-hover:text-primary transition-colors flex items-center gap-1">
                                                            Selecionar <span className="material-symbols-rounded text-[14px]" aria-hidden="true">arrow_forward</span>
                                                        </span>
                                                    </div>
                                                </button>
                                            ))
                                        )
                                    ) : (
                                        students.length === 0 ? (
                                            <p className="text-center text-slate-600 dark:text-slate-300 py-8">Nenhum aluno com treino ativo.</p>
                                        ) : (
                                            students.map(student => (
                                                <button
                                                    key={student.id}
                                                    type="button"
                                                    onClick={() => handleSelectRoutine(student.active_routine)}
                                                    className="w-full min-h-[44px] flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                                >
                                                    <img
                                                        src={student.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.profiles?.full_name || 'Aluno')}&background=random`}
                                                        alt={student.profiles?.full_name || 'Aluno'}
                                                        loading="lazy"
                                                        width="40"
                                                        height="40"
                                                        className="w-10 h-10 rounded-full bg-slate-200 object-cover"
                                                    />
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">{student.profiles?.full_name}</h3>
                                                        <p className="text-xs text-primary truncate max-w-[200px]">{student.active_routine?.name}</p>
                                                    </div>
                                                    <span className="material-symbols-rounded text-slate-400" aria-hidden="true">arrow_forward_ios</span>
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
                            <p className="text-sm text-slate-600 dark:text-slate-300">Selecione qual treino de <strong>{selectedRoutine.name}</strong> você deseja importar.</p>

                            <div className="space-y-2">
                                {(selectedRoutine.workouts || []).map((w: any) => (
                                    <button
                                        key={w.id}
                                        type="button"
                                        onClick={() => handleSelectWorkout(w)}
                                        className="w-full min-h-[44px] flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm tabular-nums">
                                                {w.day_number || w.order_index}
                                            </div>
                                            <span className="font-bold text-slate-900 dark:text-white">{w.name}</span>
                                        </div>
                                        <span className="material-symbols-rounded text-slate-400" aria-hidden="true">arrow_forward</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: EXERCISE SELECTION (Selective Cloning) */}
                    {step === 'exercises' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm text-slate-600 dark:text-slate-300">Selecione os exercícios para importar.</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (selectedExerciseIds.size === availableExercises.length) setSelectedExerciseIds(new Set());
                                        else setSelectedExerciseIds(new Set(availableExercises.map(e => e.id)));
                                    }}
                                    className="text-primary text-xs font-bold hover:underline min-h-[44px] px-2.5 rounded-lg flex items-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                    {selectedExerciseIds.size === availableExercises.length ? 'Desmarcar todos' : 'Marcar todos'}
                                </button>
                            </div>

                            {loading ? (
                                <div className="py-10 text-center flex flex-col items-center justify-center gap-2" role="status" aria-live="polite">
                                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                                    <span className="sr-only">Carregando exercícios para importação...</span>
                                </div>
                            ) : availableExercises.length === 0 ? (
                                <p className="text-center text-slate-600 dark:text-slate-300 py-10">Este treino não possui exercícios.</p>
                            ) : (
                                <div className="space-y-2">
                                    {availableExercises.map(item => {
                                        const isSelected = selectedExerciseIds.has(item.id);
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                role="checkbox"
                                                aria-checked={isSelected}
                                                onClick={() => toggleExerciseSelection(item.id)}
                                                className={`w-full min-h-[44px] text-left flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isSelected ? 'bg-primary/5 border-primary/50' : 'bg-slate-50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800'}`}
                                            >
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600'}`}>
                                                    {isSelected && <span className="material-symbols-rounded text-white text-sm" aria-hidden="true">check</span>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{item.exercise?.name}</h4>
                                                        {item.exercise_groups && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                                                {item.exercise_groups.group_type === 'superset' && 'Biset'}
                                                                {item.exercise_groups.group_type === 'triset' && 'Triset'}
                                                                {item.exercise_groups.group_type === 'giant_set' && 'Giant Set'}
                                                                {item.exercise_groups.group_type === 'paired_antagonist' && 'Pareado Antagonista'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">{item.sets?.length} séries</p>
                                                </div>
                                            </button>
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
                            type="button"
                            onClick={handleConfirmImport}
                            disabled={selectedExerciseIds.size === 0}
                            aria-label={`Importar ${selectedExerciseIds.size} exercícios selecionados`}
                            className="w-full min-h-[44px] py-3 bg-primary disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-bold tabular-nums shadow-lg shadow-primary/20 hover:bg-primary-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
