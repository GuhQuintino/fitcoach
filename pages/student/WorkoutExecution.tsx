import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '../../components/Layout/MainLayout';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import VideoPlayerModal from '../../components/shared/VideoPlayerModal';
import DescriptionModal from '../../components/shared/DescriptionModal';
import ExerciseHistoryModal from '../../components/shared/ExerciseHistoryModal';

const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

interface TriggerSet {
    id: string; // real ID or temp ID
    type: string;
    weight: string;
    reps: string;
    rpe: string;
    rest_seconds: number;
    completed: boolean;
    weight_target?: number | null;
    reps_target?: string | null;
    rpe_target?: string | null;
    prev_log?: string; // string representation of previous log e.g. "50kg x 10"
}

interface TriggerExercise {
    id: string; // exercise_id (ref to exercises table)
    workout_item_id: string;
    name: string;
    video_url: string;
    description: string;
    notes?: string;
    sets: TriggerSet[];
}

const WorkoutExecution: React.FC = () => {
    const { user, preferences } = useAuth();
    const navigate = useNavigate();
    const { id: workoutId } = useParams();

    const [loading, setLoading] = useState(true);
    const [workout, setWorkout] = useState<any>(null);
    const [exercises, setExercises] = useState<TriggerExercise[]>([]);

    // Timer State
    const [startTime, setStartTime] = useState<Date>(new Date());
    const [timerActive, setTimerActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);
    const [initialTime, setInitialTime] = useState(60);
    const [toastVisible, setToastVisible] = useState(false);
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // PSE Modal
    const [pseModal, setPseModal] = useState<{ open: boolean, exerciseIndex: number | null, setIndex: number | null }>({
        open: false, exerciseIndex: null, setIndex: null
    });

    const [videoModal, setVideoModal] = useState<{ open: boolean, url: string, title: string }>({
        open: false, url: '', title: ''
    });

    const [descModal, setDescModal] = useState<{ open: boolean, description: string, title: string }>({
        open: false, description: '', title: ''
    });

    const [historyModal, setHistoryModal] = useState<{ open: boolean, exerciseId: string | null, exerciseName: string }>({
        open: false, exerciseId: null, exerciseName: ''
    });

    const [finishModalOpen, setFinishModalOpen] = useState(false);
    const [workoutComment, setWorkoutComment] = useState('');

    // Stats
    const [volume, setVolume] = useState(0);
    const [setsCompleted, setSetsCompleted] = useState(0);

    const [duration, setDuration] = useState('00:00');
    const [seriesHelpModal, setSeriesHelpModal] = useState(false);

    useEffect(() => {
        if (user && workoutId) {
            fetchWorkoutData();
        }
    }, [user, workoutId]);

    // Duration Timer
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            const m = Math.floor(diff / 60).toString().padStart(2, '0');
            const s = (diff % 60).toString().padStart(2, '0');
            setDuration(`${m}:${s} `);
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    // Auto-scroll to focused exercise
    useEffect(() => {
        if (!loading && exercises.length > 0) {
            if (preferences.focusMode) {
                const el = document.getElementById(`exercise-${currentExerciseIndex}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    }, [currentExerciseIndex, loading, exercises.length, preferences.focusMode]);

    // Calculate Volume & Sets
    useEffect(() => {
        let v = 0;
        let s = 0;
        exercises.forEach(ex => {
            ex.sets.forEach(set => {
                if (set.completed) {
                    s++;
                    const w = parseFloat(set.weight) || 0;
                    const r = parseFloat(set.reps) || 0;
                    v += w * r;
                }
            });
        });
        setVolume(v);
        setSetsCompleted(s);
    }, [exercises]);

    const fetchWorkoutData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Workout Details
            const { data: wData, error: wError } = await supabase
                .from('workouts')
                .select('*')
                .eq('id', workoutId)
                .single();
            if (wError) throw wError;
            setWorkout(wData);

            // 2. Fetch Items (Exercises) & Sets
            const { data: itemsData, error: iError } = await supabase
                .from('workout_items')
                .select(`
id,
    order_index,
    coach_notes,
    exercise: exercises(
        id, name, video_url, description
    ),
        sets: workout_sets(
            id, set_order, type, weight_target, reps_target, rest_seconds, rpe_target
        )
            `)
                .eq('workout_id', workoutId)
                .order('order_index')
                .order('set_order', { foreignTable: 'workout_sets', ascending: true });

            if (iError) throw iError;

            // 3. Transform to local state
            const mappedExercises: TriggerExercise[] = itemsData.map((item: any) => ({
                id: item.exercise.id,
                workout_item_id: item.id,
                name: item.exercise.name,
                video_url: item.exercise.video_url,
                description: item.exercise.description || '',
                notes: item.coach_notes,
                sets: item.sets
                    .sort((a: any, b: any) => a.set_order - b.set_order)
                    .map((set: any) => ({
                        id: set.id,
                        type: set.type,
                        weight: '',
                        prev_log: '-', // Will be updated below
                        reps: '', // Do not pre-fill with target as it might be a range (e.g. "8-12")
                        rpe: '',
                        rest_seconds: set.rest_seconds || 60,
                        weight_target: set.weight_target,
                        reps_target: set.reps_target,
                        rpe_target: set.rpe_target,
                        completed: false
                    }))
            }));

            // 4. Fetch Previous Logs for each exercise
            const exerciseIds = mappedExercises.map(ex => ex.id);
            const { data: recentLogs, error: logError } = await supabase
                .from('set_logs')
                .select(`
exercise_id,
    weight_kg,
    reps_completed,
    rpe_actual,
    workout_logs!inner(finished_at)
                `)
                .eq('workout_logs.student_id', user!.id)
                .in('exercise_id', exerciseIds)
                .order('workout_logs(finished_at)', { ascending: false });

            if (!logError && recentLogs) {
                mappedExercises.forEach(ex => {
                    const logs = recentLogs.filter(l => l.exercise_id === ex.id);
                    ex.sets.forEach((set, idx) => {
                        const hist = logs[idx]; // Try to match by index roughly or just show most recent entries
                        if (hist) {
                            set.prev_log = `${hist.weight_kg}kg x ${hist.reps_completed}${hist.rpe_actual ? ' @' + hist.rpe_actual : ''} `;
                        }
                    });
                });
            }

            // Check localStorage for progress
            const saved = localStorage.getItem('active_workout');
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    if (data.workoutId === workoutId) {
                        setStartTime(new Date(data.startTime));
                        // Merge saved set completion/data with fresh exercise info
                        const merged = mappedExercises.map(ex => {
                            const savedEx = data.exercises.find((sEx: any) => sEx.workout_item_id === ex.workout_item_id);
                            if (savedEx) {
                                return {
                                    ...ex,
                                    sets: ex.sets.map((set: any, idx: number) => {
                                        const savedSet = savedEx.sets[idx];
                                        return savedSet ? { ...set, weight: savedSet.weight, reps: savedSet.reps, rpe: savedSet.rpe, completed: savedSet.completed } : set;
                                    })
                                };
                            }
                            return ex;
                        });
                        setExercises(merged);
                        setLoading(false);
                        return;
                    }
                } catch (e) {
                    console.error("Error parsing saved workout", e);
                }
            }

            setExercises(mappedExercises);

        } catch (error) {
            console.error(error);
            toast.error('Erro ao carregar treino.');
        } finally {
            setLoading(false);
        }
    };

    // --- Actions ---

    const handleInputChange = (exIndex: number, setIndex: number, field: keyof TriggerSet, value: any) => {
        const newExercises = [...exercises];
        newExercises[exIndex].sets[setIndex] = {
            ...newExercises[exIndex].sets[setIndex],
            [field]: value
        };
        setExercises(newExercises);
        saveToLocalStorage(newExercises);
    };

    const saveToLocalStorage = (currentExercises: TriggerExercise[]) => {
        const sessionData = {
            workoutId,
            exercises: currentExercises,
            startTime: startTime.toISOString(),
            lastUpdate: new Date().toISOString()
        };
        localStorage.setItem('active_workout', JSON.stringify(sessionData));
    };

    const toggleSetCompletion = (exIndex: number, setIndex: number) => {
        const newExercises = [...exercises];
        const set = newExercises[exIndex].sets[setIndex];
        const wasCompleted = set.completed;

        set.completed = !wasCompleted;
        setExercises(newExercises);
        saveToLocalStorage(newExercises);

        if (!wasCompleted) {
            // Check if all sets of current exercise are completed to move focus
            const allSetsCompleted = newExercises[exIndex].sets.every(s => s.completed);
            if (allSetsCompleted && exIndex === currentExerciseIndex && exIndex < exercises.length - 1) {
                setCurrentExerciseIndex(exIndex + 1);
            }

            // Started Rest
            startRestTimer(set.rest_seconds);
        }
    };

    const startRestTimer = (duration: number) => {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeLeft(duration);
        setInitialTime(duration);
        setTimerActive(true);
        setToastVisible(true);

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    stopRestTimer();
                    // Audio beep?
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const stopRestTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimerActive(false);
        // Keep toast visible for a moment? Or hide.
        // Let's hide it 
        setToastVisible(false); // Maybe change to "Ready!" state?
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s} `;
    };

    const handleFinishWorkout = async () => {
        if (setsCompleted === 0) {
            toast.error('Complete pelo menos 1 série para salvar.');
            return;
        }
        setFinishModalOpen(true);
    };

    const confirmFinishWorkout = async (overallEffort: number) => {
        try {
            setFinishModalOpen(false);
            const toastId = toast.loading('Salvando treino...');

            const now = new Date();
            const durationSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);

            // 1. Create Log Header
            const { data: logData, error: logError } = await supabase
                .from('workout_logs')
                .insert({
                    student_id: user!.id,
                    workout_id: workoutId,
                    started_at: startTime.toISOString(),
                    finished_at: now.toISOString(),
                    effort_rating: overallEffort,
                    feedback_notes: workoutComment
                })
                .select()
                .single();

            if (logError) throw logError;

            // 2. Create Log Sets
            const setsToInsert: any[] = [];
            exercises.forEach(ex => {
                ex.sets.forEach((set, i) => {
                    if (set.completed) {
                        setsToInsert.push({
                            workout_log_id: logData.id,
                            exercise_id: ex.id,
                            set_type: set.type,
                            weight_kg: parseFloat(set.weight) || 0,
                            reps_completed: parseInt(set.reps) || 0,
                            rpe_actual: parseInt(set.rpe) || null
                        });
                    }
                });
            });

            if (setsToInsert.length > 0) {
                const { error: setsError } = await supabase
                    .from('set_logs')
                    .insert(setsToInsert);

                if (setsError) throw setsError;
            }

            toast.dismiss(toastId);
            toast.success('Treino finalizado! Mandou bem!');
            localStorage.removeItem('active_workout');
            navigate('/student/dashboard');
        } catch (error: any) {
            console.error('Error saving workout:', error);
            toast.dismiss();
            toast.error(`Erro ao salvar: ${error.message || 'Tente novamente.'} `);
        }
    };


    if (loading) return (
        <MainLayout>
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        </MainLayout>
    );

    return (
        <MainLayout>
            <>
                <div className="min-h-screen bg-white dark:bg-slate-900 pb-24 relative">
                    {/* Header */}
                    <header className="sticky top-0 z-40 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="px-4 py-3 flex items-center justify-between">
                            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <span className="material-symbols-rounded">arrow_back</span>
                            </button>
                            <div className="flex-1 px-2 text-center">
                                <h1 className="text-base font-bold text-slate-900 dark:text-white truncate">{workout?.name}</h1>
                            </div>
                            <button
                                onClick={handleFinishWorkout}
                                className="bg-sky-500 hover:bg-sky-600 !text-white px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors shadow-sm active:scale-95"
                            >
                                Concluir
                            </button>
                        </div>
                    </header>

                    <main className="px-4 py-4 space-y-6">
                        {/* Stats Bar */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-slate-100 dark:border-slate-700 grid grid-cols-3 gap-2 text-center divide-x divide-slate-100 dark:divide-slate-700 transition-colors">
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Duração</p>
                                <p className="text-lg font-bold text-sky-500">{duration}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Volume</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{volume} kg</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Séries</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{setsCompleted}</p>
                            </div>
                        </div>

                        {/* Exercises List */}
                        <div className="space-y-6">
                            {exercises.map((exercise, exIndex) => {
                                const isFocused = currentExerciseIndex === exIndex;
                                const isCompleted = exIndex < currentExerciseIndex;
                                const shouldFocus = preferences.focusMode;

                                return (
                                    <div
                                        key={exercise.id + exIndex}
                                        id={`exercise-${exIndex}`}
                                        className={`transition-all duration-500 mb-8 ${shouldFocus
                                            ? (isFocused ? 'scale-[1.02] opacity-100 z-10' : 'scale-95 opacity-50 grayscale')
                                            : 'opacity-100'
                                            }`}
                                    >
                                        <div className={`bg-white dark:bg-slate-800 rounded-xl sm:rounded-[2.5rem] shadow-soft border transition-all duration-500 overflow-hidden ${shouldFocus && isFocused ? 'border-primary/30 ring-4 ring-primary/5 shadow-focus-glow' : 'border-slate-100 dark:border-slate-700'}`}>
                                            {/* Exercise Header */}
                                            <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                                                <div className="flex items-start justify-between mb-3 px-1">
                                                    <div className="flex items-center gap-3">
                                                        {/* Thumbnail Area */}
                                                        <div
                                                            className="w-14 h-14 rounded-xl bg-sky-50 dark:bg-sky-900/20 flex-shrink-0 overflow-hidden relative group cursor-pointer border border-sky-100/50 dark:border-sky-500/10"
                                                            onClick={() => {
                                                                if (exercise.video_url) {
                                                                    setVideoModal({ open: true, url: exercise.video_url, title: exercise.name });
                                                                }
                                                            }}
                                                        >
                                                            {(() => {
                                                                const ytId = getYouTubeId(exercise.video_url);
                                                                const videoUrl = exercise.video_url;
                                                                const isGif = videoUrl?.toLowerCase().endsWith('.gif');
                                                                const isMp4 = videoUrl?.toLowerCase().endsWith('.mp4');

                                                                if (isGif) return <img src={videoUrl} className="w-full h-full object-cover" alt="GIF" />;
                                                                if (ytId) return (
                                                                    <>
                                                                        <img
                                                                            src={`https://img.youtube.com/vi/${ytId}/0.jpg`}
                                                                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                                                            alt="Preview"
                                                                        />
                                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                                            <span className="material-symbols-rounded text-sky-500 text-2xl drop-shadow-sm group-hover:scale-110 transition-transform">play_circle</span>
                                                                        </div>
                                                                    </>
                                                                );
                                                                if (isMp4) return (
                                                                    <video src={videoUrl} className="w-full h-full object-cover" muted playsInline />
                                                                );
                                                                return (
                                                                    <div className="w-full h-full flex items-center justify-center text-sky-300 dark:text-sky-700">
                                                                        <span className="material-symbols-rounded text-2xl">image</span>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div >

                                                        <div className="cursor-pointer group/title" onClick={() => setDescModal({ open: true, description: exercise.description, title: exercise.name })}>
                                                            <div className="flex items-center gap-1.5">
                                                                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 group-hover/title:text-sky-500 transition-colors">{exercise.name}</h3>
                                                                <span className="material-symbols-rounded text-[18px] text-slate-300 group-hover/title:text-sky-400">info</span>
                                                            </div>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Toque para detalhes</p>
                                                        </div>
                                                    </div >
                                                </div >
                                                {
                                                    exercise.notes && (
                                                        <div className="mx-2 mb-3 bg-sky-50/50 dark:bg-sky-900/10 p-3 rounded-2xl border border-sky-100 dark:border-sky-500/10 flex gap-3 items-start">
                                                            <span className="material-symbols-rounded text-sky-500 text-lg mt-0.5">sticky_note</span>
                                                            <div className="flex-1">
                                                                <span className="uppercase text-[10px] font-bold text-sky-600 dark:text-sky-400 block mb-0.5 tracking-wider">Nota do Coach</span>
                                                                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 italic leading-relaxed">
                                                                    "{exercise.notes}"
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                            </div >

                                            {/* Sets Flow */}
                                            <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                                <div className="grid grid-cols-[22px_1fr_54px_44px_36px_28px] sm:grid-cols-[40px_1fr_75px_70px_50px_45px] gap-0.5 sm:gap-2 px-2 sm:px-3 py-2 bg-slate-50 dark:bg-slate-800/50 text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                                                    <div>#</div>
                                                    <div className="text-left">Anterior</div>
                                                    <div>kg</div>
                                                    <div>Reps</div>
                                                    <div>PSE</div>
                                                    <div>✓</div>
                                                </div>

                                                {
                                                    (() => {
                                                        let workingSetCount = 0;
                                                        return exercise.sets.map((set, setIndex) => {
                                                            const isWarmup = set.type === 'warmup';
                                                            const isFailure = set.type === 'failure';
                                                            const isDropset = set.type === 'dropset';

                                                            if (set.type === 'working') workingSetCount++;

                                                            const rowBg = set.completed
                                                                ? 'bg-emerald-50/40 dark:bg-emerald-900/10'
                                                                : (isWarmup ? 'bg-amber-50/30 dark:bg-amber-900/5' : (isFailure ? 'bg-red-50/30 dark:bg-red-900/5' : (isDropset ? 'bg-purple-50/30 dark:bg-purple-900/5' : '')));

                                                            const getSetIcon = () => {
                                                                if (isWarmup) return <button onClick={() => setSeriesHelpModal(true)} className="flex items-center justify-center w-full"><span className="material-symbols-rounded text-amber-500 text-sm">local_fire_department</span></button>;
                                                                if (isFailure) return <button onClick={() => setSeriesHelpModal(true)} className="flex items-center justify-center w-full"><span className="material-symbols-rounded text-red-600 text-sm">bolt</span></button>;
                                                                if (isDropset) return <button onClick={() => setSeriesHelpModal(true)} className="flex items-center justify-center w-full"><span className="material-symbols-rounded text-purple-500 text-sm">layers</span></button>;
                                                                return <button onClick={() => setSeriesHelpModal(true)} className="text-sky-600 dark:text-sky-400 font-bold text-xs w-full font-mono">{workingSetCount}</button>;
                                                            };

                                                            return (
                                                                <div key={set.id + setIndex} className={`grid grid-cols-[22px_1fr_54px_44px_36px_28px] sm:grid-cols-[40px_1fr_75px_70px_50px_45px] gap-0.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 items-center transition-all duration-300 ${rowBg}`}>
                                                                    <div className="flex items-center justify-center">
                                                                        {getSetIcon()}
                                                                    </div>
                                                                    <div className="text-left overflow-hidden min-w-0">
                                                                        <button
                                                                            onClick={() => setHistoryModal({ open: true, exerciseId: exercise.id, exerciseName: exercise.name })}
                                                                            className="text-[9px] sm:text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate hover:text-sky-500 transition-colors flex items-center gap-0.5 sm:gap-1 group/hist max-w-full"
                                                                        >
                                                                            <span className="truncate">{set.prev_log || '-'}</span>
                                                                            {set.prev_log && <span className="material-symbols-rounded text-[11px] opacity-0 group-hover/hist:opacity-100 flex-shrink-0">history</span>}
                                                                        </button>
                                                                        <div className="flex flex-wrap items-center gap-0.5 sm:gap-1">
                                                                            {set.weight_target && (
                                                                                <span className="text-[9px] sm:text-[10px] bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 px-1.5 sm:px-2 py-0.5 rounded-full font-bold uppercase tracking-tight">{set.weight_target}kg</span>
                                                                            )}
                                                                            {set.reps_target && (
                                                                                <span className="text-[9px] sm:text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 px-1.5 sm:px-2 py-0.5 rounded-full font-bold uppercase tracking-tight">{set.reps_target}r</span>
                                                                            )}
                                                                            {set.rpe_target && (
                                                                                <span className="text-[9px] sm:text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 px-1.5 sm:px-2 py-0.5 rounded-full font-bold uppercase tracking-tight">@{set.rpe_target}</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <input
                                                                            type="number"
                                                                            inputMode="decimal"
                                                                            className={`w-full h-8 sm:h-10 text-center text-[11px] sm:text-sm font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg sm:rounded-xl focus:border-sky-500 focus:ring-1 focus:ring-sky-500 px-1 text-slate-900 dark:text-white transition-all shadow-sm ${set.completed ? 'opacity-60' : ''}`}
                                                                            placeholder={set.prev_log !== '-' ? set.prev_log.split('kg')[0] : (set.weight_target ? String(set.weight_target) : '-')}
                                                                            value={set.weight}
                                                                            onChange={(e) => handleInputChange(exIndex, setIndex, 'weight', e.target.value)}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <input
                                                                            type="number"
                                                                            inputMode="numeric"
                                                                            className={`w-full h-7 sm:h-9 text-center text-xs sm:text-sm font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg sm:rounded-xl focus:border-sky-500 focus:ring-1 focus:ring-sky-500 p-0 text-slate-900 dark:text-white transition-all shadow-sm ${set.completed ? 'opacity-60' : ''}`}
                                                                            placeholder={set.reps_target && !set.reps_target.includes('-') ? set.reps_target : '-'}
                                                                            value={set.reps}
                                                                            onChange={(e) => handleInputChange(exIndex, setIndex, 'reps', e.target.value)}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <button
                                                                            onClick={() => setPseModal({ open: true, exerciseIndex: exIndex, setIndex: setIndex })}
                                                                            className={`w-full h-7 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all shadow-sm ${set.rpe ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 ring-2 ring-primary/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'} ${set.completed ? 'opacity-60' : ''}`}
                                                                        >
                                                                            {set.rpe || (set.rpe_target ? `@${set.rpe_target}` : '@')}
                                                                        </button>
                                                                    </div>
                                                                    <div className="flex justify-center">
                                                                        <button
                                                                            onClick={() => toggleSetCompletion(exIndex, setIndex)}
                                                                            className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-all ${set.completed ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-105' : 'bg-slate-100 dark:bg-slate-700 text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                                                                        >
                                                                            <span className="material-symbols-rounded text-lg sm:text-xl">check</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        });
                                                    })()
                                                }
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </main >

                    {/* Compact Floating Rest Timer */}
                    {
                        toastVisible && (
                            <div className="fixed bottom-24 left-4 right-4 z-[90] animate-slide-up">
                                <div className="bg-slate-900/90 dark:bg-white/95 backdrop-blur-xl p-4 rounded-[2rem] shadow-2xl border border-white/10 dark:border-slate-200 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center relative overflow-hidden shrink-0">
                                            <div
                                                className="absolute bottom-0 left-0 right-0 bg-primary/40 transition-all duration-1000 ease-linear origin-bottom"
                                                style={{ height: `${((initialTime - timeLeft) / initialTime) * 100}%` }}
                                            ></div>
                                            <span className="material-symbols-rounded text-2xl text-primary relative z-10">timer</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Descanso</span>
                                            <span className="font-mono text-2xl font-black tabular-nums text-white dark:text-slate-900 leading-none">
                                                {formatTime(timeLeft)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex bg-white/10 dark:bg-slate-100 p-1 rounded-xl">
                                            <button onClick={() => setTimeLeft(prev => Math.max(0, prev - 15))} className="w-10 h-10 flex items-center justify-center text-white dark:text-slate-600 hover:text-primary transition-colors">
                                                <span className="material-symbols-rounded text-lg">remove</span>
                                            </button>
                                            <button onClick={() => setTimeLeft(prev => prev + 15)} className="w-10 h-10 flex items-center justify-center text-white dark:text-slate-600 hover:text-primary transition-colors border-l border-white/10 dark:border-slate-200">
                                                <span className="material-symbols-rounded text-lg">add</span>
                                            </button>
                                        </div>
                                        <button
                                            onClick={stopRestTimer}
                                            className="h-12 px-6 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all text-xs whitespace-nowrap"
                                        >
                                            Pular
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </div >

                <VideoPlayerModal
                    isOpen={videoModal.open}
                    onClose={() => setVideoModal({ ...videoModal, open: false })}
                    videoUrl={videoModal.url}
                    title={videoModal.title}
                />

                <DescriptionModal
                    isOpen={descModal.open}
                    onClose={() => setDescModal({ ...descModal, open: false })}
                    description={descModal.description}
                    title={descModal.title}
                />
                <RPEGuideModal
                    isOpen={pseModal.open}
                    onClose={() => setPseModal({ ...pseModal, open: false })}
                    currentValue={pseModal.exerciseIndex !== null && pseModal.setIndex !== null ? exercises[pseModal.exerciseIndex].sets[pseModal.setIndex].rpe : ''}
                    onSelect={(pse) => {
                        if (pseModal.exerciseIndex !== null && pseModal.setIndex !== null) {
                            handleInputChange(pseModal.exerciseIndex, pseModal.setIndex, 'rpe', pse);
                            setPseModal({ ...pseModal, open: false });
                        }
                    }}
                />

                <SeriesHelpModal
                    isOpen={seriesHelpModal}
                    onClose={() => setSeriesHelpModal(false)}
                />

                <ExerciseHistoryModal
                    isOpen={historyModal.open}
                    onClose={() => setHistoryModal({ ...historyModal, open: false })}
                    exerciseId={historyModal.exerciseId}
                    exerciseName={historyModal.exerciseName}
                    studentId={user!.id}
                />

                <FinishWorkoutModal
                    isOpen={finishModalOpen}
                    onClose={() => setFinishModalOpen(false)}
                    onConfirm={confirmFinishWorkout}
                    comment={workoutComment}
                    onCommentChange={setWorkoutComment}
                />
            </>
        </MainLayout >
    );
};

const FinishWorkoutModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    onConfirm: (effort: number) => void,
    comment: string,
    onCommentChange: (val: string) => void
}> = ({ isOpen, onClose, onConfirm, comment, onCommentChange }) => {
    const [effort, setEffort] = useState(7);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-t-[32px] sm:rounded-3xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6 sm:hidden"></div>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-sky-50 dark:bg-sky-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-sky-100 dark:border-sky-500/10">
                        <span className="material-symbols-rounded text-3xl text-sky-500">task_alt</span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Finalizar Treino?</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Como você avalia o esforço total deste treino?</p>
                </div>

                <div className="space-y-6 mb-8">
                    <div className="flex justify-between items-end px-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Leve</span>
                        <span className="text-4xl font-black text-sky-500">{effort}</span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Máximo</span>
                    </div>

                    <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={effort}
                        onChange={(e) => setEffort(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />

                    <div className="grid grid-cols-10 gap-1 px-1">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                            <div key={n} className={`h-1 rounded-full ${n <= effort ? 'bg-sky-500' : 'bg-slate-100 dark:bg-slate-700'}`}></div>
                        ))}
                    </div>

                    <div className="mt-6">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Comentários Adicionais</label>
                        <textarea
                            value={comment}
                            onChange={(e) => onCommentChange(e.target.value)}
                            placeholder="Como você se sentiu hoje? Cargas fáceis? Alguma dor?"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 min-h-[100px] transition-all resize-none"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => onConfirm(effort)}
                        className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-rounded">check_circle</span>
                        Salvar e Finalizar
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl transition-all active:scale-[0.98]"
                    >
                        Continuar Treinando
                    </button>
                </div>
            </div>
        </div>
    );
};

const RPEGuideModal: React.FC<{ isOpen: boolean, onClose: () => void, onSelect: (pse: string) => void, currentValue?: string }> = ({ isOpen, onClose, onSelect, currentValue }) => {
    if (!isOpen) return null;

    // Escala completa com valores intermediários (igual ao que o coach pode definir)
    const rpeValues = [0, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Escala de Esforço (PSE)</h3>
                    <button onClick={onClose} className="p-2 -mr-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {rpeValues.map(n => {
                        const strVal = n.toString();
                        const isSelected = currentValue === strVal;
                        const isHigh = n >= 9;
                        const isMedHigh = n >= 7.5 && n < 9;
                        return (
                            <button
                                key={n}
                                onClick={() => onSelect(strVal)}
                                className={`h-11 rounded-xl font-bold text-sm transition-all ${isSelected
                                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20 scale-105 ring-2 ring-sky-500 ring-offset-2 dark:ring-offset-slate-800'
                                    : isHigh ? 'bg-red-50 text-red-600 dark:bg-red-900/20' : isMedHigh ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'} hover:scale-105 active:scale-95`}
                            >
                                {n}
                            </button>
                        );
                    })}
                </div>
                <p className="mt-4 text-[10px] text-slate-400 text-center uppercase tracking-widest font-bold">5-6 = Aquecimento | 10 = Falha Total</p>
            </div>
        </div>
    );
};

const SeriesHelpModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[210] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">Tipos de Séries</h3>
                    <button onClick={onClose} className="p-2 -mr-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="flex gap-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
                        <span className="material-symbols-rounded text-amber-500 text-2xl shrink-0">local_fire_department</span>
                        <div>
                            <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm">Aquecimento (Warm-up)</h4>
                            <p className="text-[11px] text-amber-800/70 dark:text-amber-300/60 leading-relaxed">Séries com carga leve para preparar as articulações e o sistema nervoso. Não contam para o volume total de trabalho.</p>
                        </div>
                    </div>

                    <div className="flex gap-4 p-3 rounded-2xl bg-sky-50 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-900/20">
                        <div className="w-6 h-6 rounded bg-sky-500 flex items-center justify-center text-[10px] font-black text-white shrink-0">1</div>
                        <div>
                            <h4 className="font-bold text-sky-900 dark:text-sky-200 text-sm">Série de Trabalho</h4>
                            <p className="text-[11px] text-sky-800/70 dark:text-sky-300/60 leading-relaxed">Séries efetivas onde o objetivo é atingir a carga e repetições prescritas pelo treinador.</p>
                        </div>
                    </div>

                    <div className="flex gap-4 p-3 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                        <span className="material-symbols-rounded text-red-600 text-2xl shrink-0">bolt</span>
                        <div>
                            <h4 className="font-bold text-red-900 dark:text-red-200 text-sm">Até a Falha (All-out)</h4>
                            <p className="text-[11px] text-red-800/70 dark:text-red-300/60 leading-relaxed">Executar o máximo de repetições possíveis com a carga selecionada, mantendo a forma correta.</p>
                        </div>
                    </div>

                    <div className="flex gap-4 p-3 rounded-2xl bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/20">
                        <span className="material-symbols-rounded text-purple-500 text-2xl shrink-0">layers</span>
                        <div>
                            <h4 className="font-bold text-purple-900 dark:text-purple-200 text-sm">Drop-set</h4>
                            <p className="text-[11px] text-purple-800/70 dark:text-purple-300/60 leading-relaxed">Reduzir a carga sem intervalo após a falha para continuar as repetições.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkoutExecution;
