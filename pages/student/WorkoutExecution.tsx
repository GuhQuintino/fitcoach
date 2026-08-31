import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '../../components/Layout/MainLayout';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import VideoPlayerModal from '../../components/shared/VideoPlayerModal';
import DescriptionModal from '../../components/shared/DescriptionModal';
import ExerciseHistoryModal from '../../components/shared/ExerciseHistoryModal';
import RPEGuideModal from '../../components/coach/editor/RPEGuideModal';
import { isWorkoutStale, autoFinalizeWorkout, SavedWorkout } from '../../utils/staleWorkoutService';
import { saveOfflineWorkout, OfflineWorkoutPayload } from '../../utils/offlineSyncService';
import { cacheWorkoutExecution, getCachedWorkoutExecution } from '../../utils/offlineCacheService';
import { notifyNetworkError, notifyNetworkSuccess } from '../../utils/useOnlineStatus';

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

    // Alvos específicos para tempo/cardio/HIIT:
    time_target?: number | null;
    distance_target?: number | null;
    speed_target?: number | null;
    hiit_work_seconds?: number | null;
    hiit_rest_seconds?: number | null;
    hiit_work_speed?: number | null;
    hiit_rest_speed?: number | null;
    hiit_cycles?: number | null;

    // Realizados reais salvos no estado (strings para preenchimento de inputs):
    completed_at?: string;
    time_completed?: string;
    distance_completed?: string;
    speed_actual?: string;
    hiit_cycles_completed?: string;
}

interface TriggerExercise {
    id: string; // exercise_id (ref to exercises table)
    workout_item_id: string;
    name: string;
    video_url: string;
    description: string;
    notes?: string;
    exercise_type: 'reps' | 'time' | 'cardio';
    feedback?: string;
    sets: TriggerSet[];
}

const generateTimeOptions = (currentTimeTarget?: string | number) => {
    const options = [];
    for (let sec = 30; sec <= 7200; sec += 30) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        const label = `${m}:${s.toString().padStart(2, '0')}`;
        options.push({ value: sec.toString(), label });
    }

    if (currentTimeTarget && !options.some(opt => opt.value === currentTimeTarget.toString())) {
        const sec = parseInt(currentTimeTarget.toString());
        if (!isNaN(sec)) {
            const m = Math.floor(sec / 60);
            const s = sec % 60;
            const label = `${m}:${s.toString().padStart(2, '0')}`;
            options.push({ value: currentTimeTarget.toString(), label });
            options.sort((a, b) => parseInt(a.value) - parseInt(b.value));
        }
    }
    return options;
};

const formatTimeTarget = (seconds: number | string) => {
    const sec = parseInt(seconds.toString());
    if (isNaN(sec)) return seconds;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

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
    const [restEndTime, setRestEndTime] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState(60);
    const [initialTime, setInitialTime] = useState(60);
    const [toastVisible, setToastVisible] = useState(false);
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
    // Remove timerRef as we use Date check now, but keeping for safety if needed or just remove types
    const audioContextRef = useRef<AudioContext | null>(null);
    const notificationSentRef = useRef(false);

    // Sound beep quando timer termina
    const playBeep = () => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = audioContextRef.current;
            // Resume se estiver suspenso (iOS requer interação)
            if (ctx.state === 'suspended') ctx.resume();

            // Beep triplo
            [0, 0.15, 0.3].forEach(delay => {
                const oscillator = ctx.createOscillator();
                const gain = ctx.createGain();
                oscillator.connect(gain);
                gain.connect(ctx.destination);
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                gain.gain.setValueAtTime(1.0, ctx.currentTime + delay);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.12);
                oscillator.start(ctx.currentTime + delay);
                oscillator.stop(ctx.currentTime + delay + 0.12);
            });
        } catch (e) {
            console.error('Audio error:', e);
        }
    };

    const playTransitionBeep = (type: 'to_work' | 'to_rest' | 'finished') => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = audioContextRef.current;
            if (ctx.state === 'suspended') ctx.resume();

            if (type === 'to_work') {
                [0, 0.15].forEach(delay => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.frequency.value = 1000;
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(0.8, ctx.currentTime + delay);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.1);
                    osc.start(ctx.currentTime + delay);
                    osc.stop(ctx.currentTime + delay + 0.1);
                });
            } else if (type === 'to_rest') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 600;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.8, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.3);
            } else if (type === 'finished') {
                [0, 0.2, 0.4].forEach((delay, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.frequency.value = 600 + (idx * 200);
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(0.8, ctx.currentTime + delay);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.18);
                    osc.start(ctx.currentTime + delay);
                    osc.stop(ctx.currentTime + delay + 0.18);
                });
            }
        } catch (e) {
            console.error('Audio error:', e);
        }
    };

    // Notificação push (funciona em background)
    const sendRestNotification = () => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('FitCoach Pro', {
                body: 'Descanso finalizado! Hora da próxima série 💪',
                icon: '/icon-192.png',
                tag: 'rest-timer',
                requireInteraction: false
            });
        }
    };

    // HIIT Modal
    const [hiitModal, setHiitModal] = useState<{ open: boolean, exerciseIndex: number | null, setIndex: number | null }>({
        open: false, exerciseIndex: null, setIndex: null
    });

    // PSE Modal
    const [pseModal, setPseModal] = useState<{ open: boolean, exerciseIndex: number | null, setIndex: number | null }>({
        open: false, exerciseIndex: null, setIndex: null
    });
    const [rpeGuideOpen, setRpeGuideOpen] = useState(false);

    const [videoModal, setVideoModal] = useState<{ open: boolean, url: string, title: string }>({
        open: false, url: '', title: ''
    });

    const [expandedDescIds, setExpandedDescIds] = useState<Record<string, boolean>>({});
    const [descModal, setDescModal] = useState<{ open: boolean, description: string, title: string }>({
        open: false, description: '', title: ''
    });

    const [historyModal, setHistoryModal] = useState<{ open: boolean, exerciseId: string | null, exerciseName: string }>({
        open: false, exerciseId: null, exerciseName: ''
    });

    // Simple Explanation Modal
    const [explanationModal, setExplanationModal] = useState<{ open: boolean, title: string, text?: string, content?: React.ReactNode }>({
        open: false, title: '', text: ''
    });

    const [finishModalOpen, setFinishModalOpen] = useState(false);
    const [workoutComment, setWorkoutComment] = useState('');

    // Stats
    const [volume, setVolume] = useState(0);
    const [setsCompleted, setSetsCompleted] = useState(0);

    const [workoutSeconds, setWorkoutSeconds] = useState(0);
    const [isWorkoutPaused, setIsWorkoutPaused] = useState(false);
    const [seriesHelpModal, setSeriesHelpModal] = useState(false);
    const [activeTimerSet, setActiveTimerSet] = useState<{
        exIndex: number;
        setIndex: number;
        seconds: number;
        isRunning: boolean;
    } | null>(null);

    const formatWorkoutDuration = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        const mStr = m.toString().padStart(2, '0');
        const sStr = s.toString().padStart(2, '0');
        if (h > 0) {
            return `${h}:${mStr}:${sStr}`;
        }
        return `${mStr}:${sStr}`;
    };

    const duration = formatWorkoutDuration(workoutSeconds);

    useEffect(() => {
        if (user && workoutId) {
            fetchWorkoutData();
        }
    }, [user, workoutId]);

    const exercisesRef = useRef(exercises);
    useEffect(() => {
        exercisesRef.current = exercises;
    }, [exercises]);

    const startTimeRef = useRef(startTime);
    useEffect(() => {
        startTimeRef.current = startTime;
    }, [startTime]);

    const isWorkoutPausedRef = useRef(isWorkoutPaused);
    useEffect(() => {
        isWorkoutPausedRef.current = isWorkoutPaused;
    }, [isWorkoutPaused]);

    // Duration Timer (otimizado sem teardown desnecessário a cada digitação)
    useEffect(() => {
        if (isWorkoutPaused || loading) return;
        const interval = setInterval(() => {
            setWorkoutSeconds(prev => {
                const next = prev + 1;
                if (next % 5 === 0) {
                    const sessionData = {
                        workoutId,
                        exercises: exercisesRef.current,
                        startTime: startTimeRef.current.toISOString(),
                        workoutSeconds: next,
                        isWorkoutPaused: isWorkoutPausedRef.current,
                        lastUpdate: new Date().toISOString()
                    };
                    localStorage.setItem('active_workout', JSON.stringify(sessionData));
                }
                return next;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [isWorkoutPaused, loading, workoutId]);

    // Cardio/Time Active Timer Tick
    useEffect(() => {
        if (!activeTimerSet || !activeTimerSet.isRunning) return;

        const interval = setInterval(() => {
            setActiveTimerSet(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    seconds: prev.seconds + 1
                };
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [activeTimerSet?.isRunning]);

    const handleSaveTimerTime = () => {
        if (!activeTimerSet) return;
        const { exIndex, setIndex, seconds } = activeTimerSet;

        // Salvar tempo no input
        handleInputChange(exIndex, setIndex, 'time_completed', String(seconds));

        // Marcar a série como concluída e registrar timestamp
        const newExercises = [...exercises];
        const currentSet = { ...newExercises[exIndex].sets[setIndex] };
        currentSet.time_completed = String(seconds);
        currentSet.completed = true;
        currentSet.completed_at = new Date().toISOString();

        newExercises[exIndex] = {
            ...newExercises[exIndex],
            sets: newExercises[exIndex].sets.map((s, i) => i === setIndex ? currentSet : s)
        };

        setExercises(newExercises);
        saveToLocalStorage(newExercises);

        // Se for o exercício atual e terminou todas as séries, foca no próximo
        const allSetsCompleted = newExercises[exIndex].sets.every(s => s.completed);
        if (allSetsCompleted && exIndex === currentExerciseIndex && exIndex < exercises.length - 1) {
            setCurrentExerciseIndex(exIndex + 1);
        }

        // Iniciar timer de descanso
        startRestTimer(currentSet.rest_seconds);

        setActiveTimerSet(null);
    };

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

                    // Volume Calculation Logic
                    let w = parseFloat(set.weight);
                    if (isNaN(w)) {
                        /* Try implicit target if input empty */
                        if (set.weight_target) {
                            if (typeof set.weight_target === 'number') w = set.weight_target;
                            else w = parseFloat(set.weight_target);
                        }
                    }
                    if (isNaN(w)) w = 0;

                    let r = parseFloat(set.reps);
                    if (isNaN(r)) {
                        /* Try implicit target if input empty */
                        if (set.reps_target) {
                            // Handle ranges "8-12" -> 8
                            r = parseFloat(set.reps_target.toString());
                        }
                    }
                    if (isNaN(r)) r = 0;

                    v += w * r;
                }
            });
        });
        setVolume(Math.round(v)); // Round to avoid floating point weirdness
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
                        id, name, video_url, description, exercise_type
                    ),
                    sets: workout_sets(
                        id, set_order, type, weight_target, reps_target, rest_seconds, rpe_target,
                        time_target, distance_target, speed_target, hiit_work_seconds, hiit_rest_seconds,
                        hiit_work_speed, hiit_rest_speed, hiit_cycles
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
                exercise_type: item.exercise.exercise_type || 'reps',
                feedback: '',
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
                        completed: false,
                        time_target: set.time_target,
                        distance_target: set.distance_target,
                        speed_target: set.speed_target,
                        hiit_work_seconds: set.hiit_work_seconds,
                        hiit_rest_seconds: set.hiit_rest_seconds,
                        hiit_work_speed: set.hiit_work_speed,
                        hiit_rest_speed: set.hiit_rest_speed,
                        hiit_cycles: set.hiit_cycles,
                        time_completed: '',
                        distance_completed: '',
                        speed_actual: '',
                        hiit_cycles_completed: ''
                    }))
            }));

            // 4. Fetch Previous Logs — same approach as ExerciseHistoryModal
            //    Query through workout_logs → set_logs (nested) to preserve insertion order
            const exerciseIds = mappedExercises.map(ex => ex.id);
            const { data: recentWorkoutLogs, error: logError } = await supabase
                .from('workout_logs')
                .select(`
                    id,
                    finished_at,
                    set_logs!inner (
                        exercise_id,
                        weight_kg,
                        reps_completed,
                        rpe_actual,
                        set_type,
                        time_completed,
                        distance_completed,
                        speed_actual,
                        hiit_cycles_completed,
                        exercise:exercises (
                            exercise_type
                        )
                    )
                `)
                .eq('student_id', user!.id)
                .in('set_logs.exercise_id', exerciseIds)
                .order('finished_at', { ascending: false })
                .limit(10);

            if (!logError && recentWorkoutLogs) {
                mappedExercises.forEach(ex => {
                    // Find the most recent workout_log that has set_logs for this exercise
                    for (const wl of recentWorkoutLogs) {
                        const setsForExercise = (wl.set_logs as any[])?.filter(
                            (s: any) => s.exercise_id === ex.id
                        );
                        if (setsForExercise && setsForExercise.length > 0) {
                            ex.sets.forEach((set, idx) => {
                                const hist = setsForExercise[idx];
                                if (hist) {
                                    const type = hist.exercise?.exercise_type || 'reps';
                                    if (type === 'cardio') {
                                        if (hist.hiit_cycles_completed) {
                                            set.prev_log = `HIIT: ${hist.hiit_cycles_completed}c em ${formatWorkoutDuration(hist.time_completed || 0)}`;
                                        } else {
                                            const dist = hist.distance_completed !== null && hist.distance_completed !== undefined ? `${hist.distance_completed}km` : '';
                                            const speed = hist.speed_actual ? `@${hist.speed_actual}km/h` : '';
                                            const time = hist.time_completed ? ` em ${formatWorkoutDuration(hist.time_completed)}` : '';
                                            set.prev_log = `${dist} ${speed}${time}`.trim() || '-';
                                        }
                                    } else if (type === 'time') {
                                        const weight = hist.weight_kg ? ` c/ ${hist.weight_kg}kg` : '';
                                        set.prev_log = `${formatWorkoutDuration(hist.time_completed || 0)}${weight}`;
                                    } else {
                                        set.prev_log = `${hist.weight_kg}kg x ${hist.reps_completed}${hist.rpe_actual ? ' @' + hist.rpe_actual : ''} `;
                                    }
                                }
                            });
                            break;
                        }
                    }
                });
            }

            // Gravar no cache offline (TTL de 8 dias)
            if (workoutId && wData) {
                cacheWorkoutExecution(workoutId, {
                    workout: wData,
                    exercises: mappedExercises
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
                                    feedback: savedEx.feedback || '',
                                    sets: ex.sets.map((set: any, idx: number) => {
                                        const savedSet = savedEx.sets[idx];
                                        return savedSet ? {
                                            ...set,
                                            weight: savedSet.weight,
                                            reps: savedSet.reps,
                                            rpe: savedSet.rpe,
                                            completed: savedSet.completed,
                                            completed_at: savedSet.completed_at || undefined,
                                            time_completed: savedSet.time_completed || '',
                                            distance_completed: savedSet.distance_completed || '',
                                            speed_actual: savedSet.speed_actual || '',
                                            hiit_cycles_completed: savedSet.hiit_cycles_completed || ''
                                        } : set;
                                    })
                                };
                            }
                            return ex;
                        });
                        setExercises(merged);
                        if (data.workoutSeconds !== undefined) setWorkoutSeconds(data.workoutSeconds);
                        if (data.isWorkoutPaused !== undefined) setIsWorkoutPaused(data.isWorkoutPaused);
                        setLoading(false);
                        return;
                    } else if (user && isWorkoutStale(data as SavedWorkout)) {
                        // Treino anterior é de outro workout e está stale → auto-finalizar
                        autoFinalizeWorkout(data as SavedWorkout, user.id).then(res => {
                            if (res.success) {
                                toast.success(
                                    `Seu treino anterior foi salvo automaticamente ✅ (${res.completedSets}/${res.totalSets} séries)`,
                                    { duration: 5000 }
                                );
                            }
                        });
                    }
                } catch (e) {
                    console.error("Error parsing saved workout", e);
                }
            }

            setExercises(mappedExercises);
            notifyNetworkSuccess();

        } catch (error) {
            notifyNetworkError();
            console.warn('[WorkoutExecution] Falha na busca online, verificando cache:', error);
            const cached = getCachedWorkoutExecution(workoutId!);
            if (cached?.data) {
                setWorkout(cached.data.workout);
                let finalExercises = cached.data.exercises;

                // Merge com localStorage se houver progresso ativo
                const saved = localStorage.getItem('active_workout');
                if (saved) {
                    try {
                        const data = JSON.parse(saved);
                        if (data.workoutId === workoutId) {
                            setStartTime(new Date(data.startTime));
                            finalExercises = finalExercises.map((ex: any) => {
                                const savedEx = data.exercises.find((sEx: any) => sEx.workout_item_id === ex.workout_item_id);
                                if (savedEx) {
                                    return {
                                        ...ex,
                                        feedback: savedEx.feedback || '',
                                        sets: ex.sets.map((set: any, idx: number) => {
                                            const savedSet = savedEx.sets[idx];
                                            return savedSet ? { ...set, ...savedSet } : set;
                                        })
                                    };
                                }
                                return ex;
                            });
                            if (data.workoutSeconds !== undefined) setWorkoutSeconds(data.workoutSeconds);
                            if (data.isWorkoutPaused !== undefined) setIsWorkoutPaused(data.isWorkoutPaused);
                        }
                    } catch (e) {
                        console.error('Error merging saved workout with cache:', e);
                    }
                }
                setExercises(finalExercises);
            } else {
                console.error(error);
                toast.error('Erro ao carregar treino e sem cache offline.');
            }
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

    const saveToLocalStorage = (currentExercises: TriggerExercise[], secs?: number, paused?: boolean) => {
        const sessionData = {
            workoutId,
            exercises: currentExercises,
            startTime: startTime.toISOString(),
            workoutSeconds: secs !== undefined ? secs : workoutSeconds,
            isWorkoutPaused: paused !== undefined ? paused : isWorkoutPaused,
            lastUpdate: new Date().toISOString()
        };
        localStorage.setItem('active_workout', JSON.stringify(sessionData));
    };

    const toggleSetCompletion = (exIndex: number, setIndex: number) => {
        const newExercises = [...exercises];
        const currentSet = { ...newExercises[exIndex].sets[setIndex] }; // Create new object for React detection
        const wasCompleted = currentSet.completed;

        currentSet.completed = !wasCompleted;

        if (currentSet.completed) {
            currentSet.completed_at = new Date().toISOString();
        } else {
            delete currentSet.completed_at;
        }

        // Implicit Logging: Fill with target/previous if empty when checking
        if (!wasCompleted) {
            if (newExercises[exIndex].exercise_type === 'reps') {
                // WEIGHT: First try previous session, then target
                if (!currentSet.weight || currentSet.weight === '') {
                    // Try to get weight from previous log first (format: "50kg x 10 @8")
                    let prevWeight: number | null = null;
                    if (currentSet.prev_log && currentSet.prev_log !== '-') {
                        const weightPart = currentSet.prev_log.split('kg')[0];
                        if (weightPart) {
                            const parsed = parseFloat(weightPart.trim());
                            if (!isNaN(parsed)) prevWeight = parsed;
                        }
                    }

                    if (prevWeight !== null) {
                        currentSet.weight = String(prevWeight);
                    } else if (currentSet.weight_target) {
                        currentSet.weight = String(currentSet.weight_target);
                    }
                }

                // REPS: More complex - handle ranges and previous logs
                if (!currentSet.reps || currentSet.reps === '' || currentSet.reps === '-') {
                    const repsTarget = currentSet.reps_target ? String(currentSet.reps_target) : '';
                    const isRange = repsTarget.includes('-');

                    // Try to get reps from previous log first (format: "50kg x 10 @8")
                    let prevReps: number | null = null;
                    if (currentSet.prev_log && currentSet.prev_log !== '-') {
                        const parts = currentSet.prev_log.split('x');
                        if (parts.length > 1) {
                            const parsed = parseInt(parts[1].trim());
                            if (!isNaN(parsed)) prevReps = parsed;
                        }
                    }

                    if (prevReps !== null) {
                        // Use previous session's reps
                        currentSet.reps = String(prevReps);
                    } else if (repsTarget) {
                        // Use lower bound of range or exact number
                        const lowerBound = parseFloat(repsTarget);
                        currentSet.reps = isNaN(lowerBound) ? '0' : String(lowerBound);
                    } else {
                        currentSet.reps = '0';
                    }
                }
            } else {
                // Para exercícios de tempo e cardio, preenche implicitamente com targets
                if ((!currentSet.time_completed || currentSet.time_completed === '') && currentSet.time_target) {
                    currentSet.time_completed = String(currentSet.time_target);
                }
                if ((!currentSet.distance_completed || currentSet.distance_completed === '') && currentSet.distance_target) {
                    currentSet.distance_completed = String(currentSet.distance_target);
                }
                if ((!currentSet.speed_actual || currentSet.speed_actual === '') && currentSet.speed_target) {
                    currentSet.speed_actual = String(currentSet.speed_target);
                }
                if ((!currentSet.hiit_cycles_completed || currentSet.hiit_cycles_completed === '') && currentSet.hiit_cycles) {
                    currentSet.hiit_cycles_completed = String(currentSet.hiit_cycles);
                }
            }
        }

        // Update with new object reference
        newExercises[exIndex] = {
            ...newExercises[exIndex],
            sets: newExercises[exIndex].sets.map((s, i) => i === setIndex ? currentSet : s)
        };

        setExercises(newExercises);
        saveToLocalStorage(newExercises);

        if (!wasCompleted) {
            // Check if all sets of current exercise are completed to move focus
            const allSetsCompleted = newExercises[exIndex].sets.every(s => s.completed);
            if (allSetsCompleted && exIndex === currentExerciseIndex && exIndex < exercises.length - 1) {
                setCurrentExerciseIndex(exIndex + 1);
            }

            // Started Rest
            startRestTimer(currentSet.rest_seconds);
        }
    };

    // Monitorar fim do timer
    useEffect(() => {
        if (!timerActive || !restEndTime) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const diff = Math.ceil((restEndTime - now) / 1000);

            if (diff <= 0) {
                setTimeLeft(0);
                if (!notificationSentRef.current) {
                    playBeep();
                    try { sendRestNotification(); } catch (e) { }
                    notificationSentRef.current = true;
                }
            } else {
                setTimeLeft(diff);
            }
        }, 200);

        return () => clearInterval(interval);
    }, [timerActive, restEndTime]);

    const startRestTimer = (duration: number) => {
        const end = Date.now() + (duration * 1000);
        setRestEndTime(end);
        setInitialTime(duration);
        setTimeLeft(duration);
        setTimerActive(true);
        setToastVisible(true);
        notificationSentRef.current = false;

        // Pedir permissão de notificação de forma segura
        try {
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission().catch(err => console.log('Notification permission error:', err));
            }
        } catch (e) {
            console.log('Notification API not supported');
        }
    };

    const stopRestTimer = () => {
        setTimerActive(false);
        setRestEndTime(null);
        setToastVisible(false);
    };

    const addTime = (seconds: number) => {
        if (!restEndTime) return;
        const newEnd = restEndTime + (seconds * 1000);
        setRestEndTime(newEnd);
        // Reset notification flag if we add time to a finished timer
        if (timeLeft <= 0) {
            notificationSentRef.current = false;
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
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

            // Filtrar todos os timestamps de conclusão das séries concluídas
            const completedTimestamps: number[] = [];
            exercises.forEach(ex => {
                ex.sets.forEach(set => {
                    if (set.completed && set.completed_at) {
                        const ts = new Date(set.completed_at).getTime();
                        if (!isNaN(ts)) {
                            completedTimestamps.push(ts);
                        }
                    }
                });
            });

            const now = new Date();
            let realStartedAt = new Date(now.getTime() - workoutSeconds * 1000); // Fallback padrão
            let realFinishedAt = now;

            if (completedTimestamps.length > 0) {
                const minTs = Math.min(...completedTimestamps);
                const maxTs = Math.max(...completedTimestamps);

                // Se a diferença for menor que 10 segundos, coloca 60 segundos por padrão
                if (maxTs - minTs < 10000) {
                    realStartedAt = new Date(maxTs - 60000);
                    realFinishedAt = new Date(maxTs);
                } else {
                    realStartedAt = new Date(minTs);
                    realFinishedAt = new Date(maxTs);
                }
            }

            // 1. Create Log Header
            const { data: logData, error: logError } = await (supabase
                .from('workout_logs') as any)
                .insert({
                    student_id: user!.id,
                    workout_id: workoutId,
                    started_at: realStartedAt.toISOString(),
                    finished_at: realFinishedAt.toISOString(),
                    effort_rating: overallEffort,
                    feedback_notes: workoutComment
                })
                .select()
                .single();

            if (logError || !logData) throw logError || new Error('Falha ao registrar cabeçalho do treino');

            // 2. Create Log Sets
            const setsToInsert: any[] = [];
            exercises.forEach(ex => {
                ex.sets.forEach((set, i) => {
                    if (set.completed) {
                        setsToInsert.push({
                            workout_log_id: logData.id,
                            exercise_id: ex.id,
                            set_type: set.type,
                            set_order: i,
                            weight_kg: parseFloat(set.weight) || 0,
                            reps_completed: parseInt(set.reps) || 0,
                            rpe_actual: parseInt(set.rpe) || null,
                            // Novas colunas correspondentes à migração do milestone 1:
                            time_completed: parseInt(set.time_completed || '') || null,
                            distance_completed: parseFloat(set.distance_completed || '') || null,
                            speed_actual: parseFloat(set.speed_actual || '') || null,
                            hiit_cycles_completed: parseInt(set.hiit_cycles_completed || '') || null
                        });
                    }
                });
            });

            if (setsToInsert.length > 0) {
                const { error: setsError } = await (supabase
                    .from('set_logs') as any)
                    .insert(setsToInsert);

                if (setsError) throw setsError;
            }

            // 3. Save Exercise Feedbacks
            const feedbacksToInsert = exercises
                .filter(ex => ex.feedback && ex.feedback.trim() !== '')
                .map(ex => ({
                    workout_log_id: logData.id,
                    exercise_id: ex.id,
                    feedback_text: ex.feedback!.trim()
                }));

            if (feedbacksToInsert.length > 0) {
                const { error: feedbackError } = await (supabase
                    .from('exercise_feedback_logs') as any)
                    .insert(feedbacksToInsert);

                if (feedbackError) throw feedbackError;
            }

            toast.dismiss(toastId);
            toast.success('Treino finalizado! Mandou bem!');
            notifyNetworkSuccess();
            localStorage.removeItem('active_workout');
            navigate('/student/dashboard');
        } catch (error: any) {
            notifyNetworkError();
            console.error('Error saving workout to Supabase. Attempting offline queue fallback:', error);

            // Fallback: Se falhou por rede ou dispositivo offline, salva na fila local
            try {
                const completedTimestamps: number[] = [];
                exercises.forEach(ex => {
                    ex.sets.forEach(set => {
                        if (set.completed && set.completed_at) {
                            const ts = new Date(set.completed_at).getTime();
                            if (!isNaN(ts)) {
                                completedTimestamps.push(ts);
                            }
                        }
                    });
                });

                const now = new Date();
                let realStartedAt = new Date(now.getTime() - workoutSeconds * 1000);
                let realFinishedAt = now;

                if (completedTimestamps.length > 0) {
                    const minTs = Math.min(...completedTimestamps);
                    const maxTs = Math.max(...completedTimestamps);
                    if (maxTs - minTs < 10000) {
                        realStartedAt = new Date(maxTs - 60000);
                        realFinishedAt = new Date(maxTs);
                    } else {
                        realStartedAt = new Date(minTs);
                        realFinishedAt = new Date(maxTs);
                    }
                }

                const setsToQueue: any[] = [];
                exercises.forEach(ex => {
                    ex.sets.forEach((set, i) => {
                        if (set.completed) {
                            setsToQueue.push({
                                exercise_id: ex.id,
                                set_type: set.type,
                                set_order: i,
                                weight_kg: parseFloat(set.weight) || 0,
                                reps_completed: parseInt(set.reps) || 0,
                                rpe_actual: parseInt(set.rpe) || null,
                                time_completed: parseInt(set.time_completed || '') || null,
                                distance_completed: parseFloat(set.distance_completed || '') || null,
                                speed_actual: parseFloat(set.speed_actual || '') || null,
                                hiit_cycles_completed: parseInt(set.hiit_cycles_completed || '') || null
                            });
                        }
                    });
                });

                const feedbacksToQueue = exercises
                    .filter(ex => ex.feedback && ex.feedback.trim() !== '')
                    .map(ex => ({
                        exercise_id: ex.id,
                        feedback_text: ex.feedback!.trim()
                    }));

                const offlinePayload: OfflineWorkoutPayload = {
                    workoutLog: {
                        student_id: user!.id,
                        workout_id: workoutId || null,
                        started_at: realStartedAt.toISOString(),
                        finished_at: realFinishedAt.toISOString(),
                        effort_rating: overallEffort,
                        feedback_notes: workoutComment
                    },
                    setLogs: setsToQueue,
                    exerciseFeedbacks: feedbacksToQueue
                };

                const offlineRes = saveOfflineWorkout(offlinePayload);
                if (offlineRes.success) {
                    toast.dismiss();
                    toast.success('Treino salvo no aparelho! Sincronizará ao reconectar 📶', { duration: 5000 });
                    localStorage.removeItem('active_workout');
                    navigate('/student/dashboard');
                    return;
                }
            } catch (offlineErr) {
                console.error('Critical failure in offline save fallback:', offlineErr);
            }

            toast.dismiss();
            toast.error(`Erro ao salvar: ${error.message || 'Tente novamente.'}`);
        }
    };


    const renderFormattedDescription = (desc?: string) => {
        if (!desc || !desc.trim()) {
            return <p className="text-xs text-slate-500 italic">Nenhuma instrução cadastrada para este exercício.</p>;
        }

        const lines = desc.replace(/\\n/g, '\n').split('\n');
        return lines.map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={i} className="h-2" />;

            if (trimmed.startsWith('###')) {
                return <h5 key={i} className="font-bold text-xs text-sky-600 dark:text-sky-400 mt-2 mb-1 uppercase tracking-wide">{trimmed.replace(/^###\s*/, '')}</h5>;
            }
            if (trimmed.startsWith('##')) {
                return <h4 key={i} className="font-bold text-sm text-slate-800 dark:text-slate-100 mt-2.5 mb-1">{trimmed.replace(/^##\s*/, '')}</h4>;
            }
            if (trimmed.startsWith('#')) {
                return <h3 key={i} className="font-bold text-base text-slate-900 dark:text-white mt-3 mb-1.5 font-display">{trimmed.replace(/^#+\s*/, '')}</h3>;
            }
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const content = trimmed.replace(/^[-*]\s*/, '');
                const parts = content.split('**');
                return (
                    <div key={i} className="flex items-start gap-1.5 my-0.5 pl-1 text-xs text-slate-700 dark:text-slate-200">
                        <span className="text-sky-500 font-bold">•</span>
                        <span>
                            {parts.map((p, idx) => idx % 2 === 1 ? <strong key={idx} className="font-bold text-slate-900 dark:text-white">{p}</strong> : p)}
                        </span>
                    </div>
                );
            }

            const parts = line.split('**');
            return (
                <p key={i} className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed my-0.5">
                    {parts.map((part, index) =>
                        index % 2 === 1 ? <strong key={index} className="font-bold text-slate-900 dark:text-white">{part}</strong> : part
                    )}
                </p>
            );
        });
    };

    const getGridColsClass = (type: string, isHiit?: boolean) => {
        if (type === 'reps') {
            return 'grid grid-cols-[20px_minmax(0,1fr)_48px_44px_38px_38px] sm:grid-cols-[36px_minmax(0,1fr)_75px_70px_50px_46px] gap-1 sm:gap-2.5 items-center';
        }
        if (isHiit) {
            return 'grid grid-cols-[20px_minmax(0,1fr)_36px_46px_46px_38px_38px] sm:grid-cols-[36px_minmax(0,1fr)_50px_75px_75px_50px_46px] gap-1 sm:gap-2.5 items-center';
        }
        if (type === 'time') {
            return 'grid grid-cols-[20px_minmax(0,1fr)_88px_38px_38px] sm:grid-cols-[36px_minmax(0,1fr)_125px_50px_46px] gap-1 sm:gap-2.5 items-center';
        }
        // cardio tradicional
        return 'grid grid-cols-[20px_minmax(0,1fr)_66px_46px_46px_38px_38px] sm:grid-cols-[36px_minmax(0,1fr)_100px_70px_70px_50px_46px] gap-1 sm:gap-2.5 items-center';
    };

    const openTargetPrevExplanation = () => {
        setExplanationModal({
            open: true,
            title: 'Coluna Anterior / Alvo',
            content: (
                <div className="flex flex-col gap-3.5 text-sm text-slate-700 dark:text-slate-100">
                    <div className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <span className="font-bold text-slate-900 dark:text-white block mb-1.5 text-sm sm:text-base flex items-center gap-2">
                            <span className="material-symbols-rounded text-sky-500 text-lg" aria-hidden="true">history</span>
                            1. Registro Anterior (Linha Superior)
                        </span>
                        <p className="leading-relaxed text-xs sm:text-sm text-slate-600 dark:text-slate-200">
                            Exibe o que você realizou no seu último treino (ex: <strong className="text-slate-900 dark:text-white font-mono bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold">40kg x 8 @5</strong>). Toque no valor a qualquer momento para abrir o histórico detalhado de todas as sessões anteriores.
                        </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <span className="font-bold text-slate-900 dark:text-white block mb-2 text-sm sm:text-base flex items-center gap-2">
                            <span className="material-symbols-rounded text-emerald-500 text-lg" aria-hidden="true">track_changes</span>
                            2. Metas do Coach (Badges Coloridas)
                        </span>
                        <p className="leading-relaxed mb-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                            Recomendações prescritas pelo seu treinador para esta série específica:
                        </p>
                        <ul className="space-y-2 pl-1">
                            <li className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                                <span className="bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 text-xs px-2 py-0.5 rounded-md font-bold border border-sky-300/50 dark:border-sky-700/60">40KG</span>
                                <span>Carga alvo recomendada</span>
                            </li>
                            <li className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                                <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs px-2 py-0.5 rounded-md font-bold border border-emerald-300/50 dark:border-emerald-700/60">10R</span>
                                <span>Repetições ou faixa alvo (ex: 6-10R)</span>
                            </li>
                            <li className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                                <span className="bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-xs px-2 py-0.5 rounded-md font-bold border border-purple-300/50 dark:border-purple-700/60">@8</span>
                                <span>Intensidade de esforço PSE pretendida</span>
                            </li>
                        </ul>
                    </div>
                </div>
            )
        });
    };

    const renderTableHeader = (type: string, isHiit?: boolean) => {
        const gridClass = getGridColsClass(type, isHiit) + ' px-2 sm:px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 text-[10px] sm:text-xs font-extrabold text-slate-500 dark:text-slate-300 uppercase tracking-wider text-center items-center';

        if (type === 'reps') {
            return (
                <div className={gridClass}>
                    <button type="button" onClick={() => setSeriesHelpModal(true)} aria-label="Ajuda sobre numeração e tipos de séries" className="flex items-center justify-center gap-0.5 cursor-pointer hover:text-sky-500 transition-colors font-extrabold">
                        <span>#</span>
                        <span className="text-sky-500 font-bold">?</span>
                    </button>
                    <button type="button" onClick={openTargetPrevExplanation} aria-label="Explicação sobre histórico anterior e metas do treinador" className="text-left cursor-pointer hover:text-sky-500 transition-colors font-extrabold flex items-center gap-0.5">
                        <span>Ant. / Alvo</span>
                        <span className="text-sky-500 font-bold">?</span>
                    </button>
                    <button type="button" onClick={() => setExplanationModal({ open: true, title: 'Carga (KG)', text: 'Peso que você vai usar. Se for barra, some o peso da barra + anilhas dos dois lados.' })} aria-label="Explicação sobre carga em kg" className="flex items-center justify-center gap-0.5 cursor-pointer hover:text-sky-500 transition-colors font-extrabold">
                        <span>KG</span>
                        <span className="text-sky-500 font-bold">?</span>
                    </button>
                    <button type="button" onClick={() => setExplanationModal({ open: true, title: 'Repetições (Reps)', text: 'Quantas vezes executar o movimento. Se houver uma faixa (ex: 8-12), mire no mínimo 8 mantendo boa técnica.' })} aria-label="Explicação sobre repetições" className="flex items-center justify-center gap-0.5 cursor-pointer hover:text-sky-500 transition-colors font-extrabold">
                        <span>REPS</span>
                        <span className="text-sky-500 font-bold">?</span>
                    </button>
                    <button type="button" onClick={() => setRpeGuideOpen(true)} aria-label="Guia da escala de esforço percebido PSE" className="flex items-center justify-center gap-0.5 cursor-pointer hover:text-sky-500 transition-colors font-extrabold">
                        <span>PSE</span>
                        <span className="text-sky-500 font-bold">?</span>
                    </button>
                    <div className="flex items-center justify-center font-extrabold text-slate-400 dark:text-slate-400">✓</div>
                </div>
            );
        }
        if (isHiit) {
            return (
                <div className={gridClass}>
                    <button type="button" onClick={() => setSeriesHelpModal(true)} aria-label="Ajuda sobre séries HIIT" className="flex items-center justify-center gap-0.5 cursor-pointer hover:text-sky-500 transition-colors font-extrabold">
                        <span>#</span>
                        <span className="text-sky-500 font-bold">?</span>
                    </button>
                    <button type="button" onClick={openTargetPrevExplanation} aria-label="Explicação sobre histórico anterior e metas do treinador" className="text-left cursor-pointer hover:text-sky-500 transition-colors font-extrabold flex items-center gap-0.5">
                        <span>Ant. / Alvo</span>
                        <span className="text-sky-500 font-bold">?</span>
                    </button>
                    <div className="cursor-default font-extrabold" title="Executar HIIT">HIIT</div>
                    <div className="cursor-default font-extrabold" title="Ciclos completados">CICLOS</div>
                    <div className="cursor-default font-extrabold" title="Tempo total realizado em minutos/segundos">TEMPO</div>
                    <button type="button" onClick={() => setRpeGuideOpen(true)} aria-label="Guia da escala de esforço percebido PSE" className="flex items-center justify-center gap-0.5 cursor-pointer hover:text-sky-500 transition-colors font-extrabold">
                        <span>PSE</span>
                        <span className="text-sky-500 font-bold">?</span>
                    </button>
                    <div className="flex items-center justify-center font-extrabold text-slate-400 dark:text-slate-400">✓</div>
                </div>
            );
        }
        if (type === 'time') {
            return (
                <div className={gridClass}>
                    <button type="button" onClick={() => setSeriesHelpModal(true)} aria-label="Ajuda sobre séries por tempo" className="flex items-center justify-center gap-0.5 cursor-pointer hover:text-sky-500 transition-colors font-extrabold">
                        <span>#</span>
                        <span className="text-sky-500 font-bold">?</span>
                    </button>
                    <button type="button" onClick={openTargetPrevExplanation} aria-label="Explicação sobre histórico anterior e metas do treinador" className="text-left cursor-pointer hover:text-sky-500 transition-colors font-extrabold flex items-center gap-0.5">
                        <span>Ant. / Alvo</span>
                        <span className="text-sky-500 font-bold">?</span>
                    </button>
                    <div className="cursor-default font-extrabold" title="Tempo realizado em segundos">TEMPO(S)</div>
                    <button type="button" onClick={() => setRpeGuideOpen(true)} aria-label="Guia da escala de esforço percebido PSE" className="flex items-center justify-center gap-0.5 cursor-pointer hover:text-sky-500 transition-colors font-extrabold">
                        <span>PSE</span>
                        <span className="text-sky-500 font-bold">?</span>
                    </button>
                    <div className="flex items-center justify-center font-extrabold text-slate-400 dark:text-slate-400">✓</div>
                </div>
            );
        }
        // cardio tradicional
        return (
            <div className={gridClass}>
                <button type="button" onClick={() => setSeriesHelpModal(true)} aria-label="Ajuda sobre séries de cardio" className="flex items-center justify-center gap-0.5 cursor-pointer hover:text-sky-500 transition-colors font-extrabold">
                    <span>#</span>
                    <span className="text-sky-500 font-bold">?</span>
                </button>
                <button type="button" onClick={openTargetPrevExplanation} aria-label="Explicação sobre histórico anterior e metas do treinador" className="text-left cursor-pointer hover:text-sky-500 transition-colors font-extrabold flex items-center gap-0.5">
                    <span>Ant. / Alvo</span>
                    <span className="text-sky-500 font-bold">?</span>
                </button>
                <div className="cursor-default font-extrabold" title="Tempo realizado em minutos/segundos">TEMPO</div>
                <div className="cursor-default font-extrabold" title="Distância realizada em km">DIST(KM)</div>
                <div className="cursor-default font-extrabold" title="Velocidade média em km/h">VEL(KM/H)</div>
                <button type="button" onClick={() => setRpeGuideOpen(true)} aria-label="Guia da escala de esforço percebido PSE" className="flex items-center justify-center gap-0.5 cursor-pointer hover:text-sky-500 transition-colors font-extrabold">
                    <span>PSE</span>
                    <span className="text-sky-500 font-bold">?</span>
                </button>
                <div className="flex items-center justify-center font-extrabold text-slate-400 dark:text-slate-400">✓</div>
            </div>
        );
    };

    if (loading) return (
        <MainLayout>
            <div className="flex items-center justify-center h-screen" role="status" aria-live="polite">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent"></div>
            </div>
        </MainLayout>
    );

    return (
        <MainLayout>
            <>
                <div className="min-h-screen bg-white dark:bg-slate-900 pb-24 relative">
                    {/* Header */}
                    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3 border-b border-slate-100 dark:border-slate-800 transition-colors">
                        <div className="flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => navigate('/student/selection')}
                                aria-label="Voltar para a seleção de treinos"
                                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all active:scale-95 shadow-sm"
                            >
                                <span className="material-symbols-rounded text-xl" aria-hidden="true">arrow_back</span>
                            </button>

                            <div className="flex-1 text-center min-w-0 px-2">
                                <h1 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                                    {workout?.name || 'Treino'}
                                </h1>
                            </div>

                            <button
                                type="button"
                                onClick={handleFinishWorkout}
                                aria-label="Concluir treino e abrir resumo"
                                className="min-h-[44px] bg-primary hover:bg-sky-600 text-white font-bold px-5 py-2.5 rounded-2xl transition-all shadow-md shadow-primary/20 hover:shadow-glow active:scale-95 text-sm"
                            >
                                Concluir
                            </button>
                        </div>
                    </header>

                    <div className="px-4 py-4 space-y-6">
                        {/* Stats Bar */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-slate-100 dark:border-slate-700 grid grid-cols-3 gap-2 text-center divide-x divide-slate-100 dark:divide-slate-700 transition-colors">
                            <button
                                type="button"
                                onClick={() => {
                                    const nextPaused = !isWorkoutPaused;
                                    setIsWorkoutPaused(nextPaused);
                                    saveToLocalStorage(exercises, workoutSeconds, nextPaused);
                                    toast.success(nextPaused ? 'Treino pausado.' : 'Treino retomado!');
                                }}
                                aria-label={isWorkoutPaused ? 'Retomar cronômetro do treino' : 'Pausar cronômetro do treino'}
                                className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl p-1 transition-all flex flex-col items-center justify-center relative group min-h-[44px]"
                                title={isWorkoutPaused ? 'Clique para retomar o treino' : 'Clique para pausar o treino'}
                            >
                                <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1 justify-center">
                                    Duração
                                    <span className="material-symbols-rounded text-[10px]" aria-hidden="true">
                                        {isWorkoutPaused ? 'play_arrow' : 'pause'}
                                    </span>
                                </p>
                                <p className={`text-lg font-bold transition-all ${isWorkoutPaused ? 'text-amber-500 animate-pulse' : 'text-sky-500'}`}>
                                    {duration}
                                </p>
                                {isWorkoutPaused && (
                                    <span className="absolute -bottom-2 text-[8px] text-amber-500 font-bold uppercase tracking-wider">
                                        Pausado
                                    </span>
                                )}
                            </button>
                            <div className="flex flex-col items-center justify-center">
                                <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Volume</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{volume} kg</p>
                            </div>
                            <div className="flex flex-col items-center justify-center">
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
                                                        <button
                                                            type="button"
                                                            aria-label={`Ver vídeo de demonstração de ${exercise.name}`}
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

                                                                if (isGif) return <img src={videoUrl} className="w-full h-full object-cover" alt={`GIF de ${exercise.name}`} />;
                                                                if (ytId) return (
                                                                    <>
                                                                        <img
                                                                            src={`https://img.youtube.com/vi/${ytId}/0.jpg`}
                                                                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                                                            alt={`Prévia do vídeo de ${exercise.name}`}
                                                                        />
                                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                                            <span className="material-symbols-rounded text-sky-500 text-2xl drop-shadow-sm group-hover:scale-110 transition-transform" aria-hidden="true">play_circle</span>
                                                                        </div>
                                                                    </>
                                                                );
                                                                if (isMp4) return (
                                                                    <video src={videoUrl} className="w-full h-full object-cover" muted playsInline />
                                                                );
                                                                return (
                                                                    <div className="w-full h-full flex items-center justify-center text-sky-300 dark:text-sky-700">
                                                                        <span className="material-symbols-rounded text-2xl" aria-hidden="true">image</span>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            aria-expanded={!!expandedDescIds[exercise.id]}
                                                            aria-label={expandedDescIds[exercise.id] ? `Recolher detalhes de ${exercise.name}` : `Ver detalhes de ${exercise.name}`}
                                                            className="text-left group/title cursor-pointer flex-1"
                                                            onClick={() => setExpandedDescIds(prev => ({ ...prev, [exercise.id]: !prev[exercise.id] }))}
                                                        >
                                                            <div className="flex items-center gap-1.5">
                                                                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 group-hover/title:text-sky-500 transition-colors">{exercise.name}</h3>
                                                                <span
                                                                    className="material-symbols-rounded text-[20px] text-slate-400 group-hover/title:text-sky-400 transition-transform duration-300"
                                                                    style={{ transform: expandedDescIds[exercise.id] ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                                                    aria-hidden="true"
                                                                >
                                                                    expand_more
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                                {expandedDescIds[exercise.id] ? 'Toque para recolher' : 'Toque para detalhes'}
                                                            </p>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Accordion: Instruções / Descrição do Exercício */}
                                                {expandedDescIds[exercise.id] && (
                                                    <div className="mx-2 mb-3 bg-slate-50/90 dark:bg-slate-800/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 transition-all duration-300 animate-in fade-in slide-in-from-top-2">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="material-symbols-rounded text-sky-500 text-base" aria-hidden="true">menu_book</span>
                                                            <span className="uppercase text-[10px] font-bold text-sky-600 dark:text-sky-400 tracking-wider">Instruções de Execução</span>
                                                        </div>
                                                        <div className="text-slate-700 dark:text-slate-200">
                                                            {renderFormattedDescription(exercise.description)}
                                                        </div>
                                                    </div>
                                                )}

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
                                            </div>

                                            {/* Sets Flow */}
                                            <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                                {(() => {
                                                    const hasHiitAny = exercise.sets.some(s => !!(s.hiit_cycles || s.hiit_work_seconds));
                                                    return renderTableHeader(exercise.exercise_type, hasHiitAny);
                                                })()}

                                                {
                                                    (() => {
                                                        let workingSetCount = 0;
                                                        return exercise.sets.map((set, setIndex) => {
                                                            const isWarmup = set.type === 'warmup';
                                                            const isFailure = set.type === 'failure';
                                                            const isDropset = set.type === 'dropset';
                                                            const isPreparation = set.type === 'preparation';

                                                            if (set.type === 'working') workingSetCount++;

                                                            const rowBg = set.completed
                                                                ? 'bg-emerald-100/70 dark:bg-emerald-900/30'
                                                                : (isWarmup ? 'bg-amber-50/30 dark:bg-amber-900/5' : (isFailure ? 'bg-red-50/30 dark:bg-red-900/5' : (isDropset ? 'bg-purple-50/30 dark:bg-purple-900/5' : (isPreparation ? 'bg-cyan-50/30 dark:bg-cyan-900/5' : ''))));

                                                            const getSetIcon = () => {
                                                                if (isWarmup) return <button type="button" onClick={() => setSeriesHelpModal(true)} aria-label="Série de aquecimento - Ver detalhes" className="flex items-center justify-center w-full"><span className="material-symbols-rounded text-amber-500 text-sm" aria-hidden="true">local_fire_department</span></button>;
                                                                if (isFailure) return <button type="button" onClick={() => setSeriesHelpModal(true)} aria-label="Série até a falha - Ver detalhes" className="flex items-center justify-center w-full"><span className="material-symbols-rounded text-red-600 text-sm" aria-hidden="true">bolt</span></button>;
                                                                if (isDropset) return <button type="button" onClick={() => setSeriesHelpModal(true)} aria-label="Série em dropset - Ver detalhes" className="flex items-center justify-center w-full"><span className="material-symbols-rounded text-purple-500 text-sm" aria-hidden="true">layers</span></button>;
                                                                if (isPreparation) return <button type="button" onClick={() => setSeriesHelpModal(true)} aria-label="Série preparatória - Ver detalhes" className="flex items-center justify-center w-full"><span className="material-symbols-rounded text-cyan-500 text-sm" aria-hidden="true">publish</span></button>;
                                                                return <button type="button" onClick={() => setSeriesHelpModal(true)} aria-label={`Série principal número ${workingSetCount} - Ver detalhes`} className="text-sky-600 dark:text-sky-400 font-black text-sm sm:text-base w-full font-mono leading-none">{workingSetCount}</button>;
                                                            };

                                                            const isHiit = !!(set.hiit_cycles || set.hiit_work_seconds);
                                                            const gridRowClass = getGridColsClass(exercise.exercise_type, isHiit) + ` px-2 sm:px-3 py-1.5 sm:py-2 items-center transition-all duration-300 ${rowBg}`;

                                                            return (
                                                                <div key={set.id + setIndex} className={gridRowClass}>
                                                                    {/* # col */}
                                                                    <div className="flex items-center justify-center">
                                                                        {getSetIcon()}
                                                                    </div>

                                                                    {/* Anterior/Meta col */}
                                                                    <div className="text-left overflow-hidden min-w-0 flex flex-col justify-center">
                                                                        {exercise.exercise_type === 'reps' ? (
                                                                            <>
                                                                                {/* 1. Histórico Anterior (Linha 1) */}
                                                                                <button
                                                                                    type="button"
                                                                                    aria-label={`Ver histórico de cargas do exercício ${exercise.name}`}
                                                                                    onClick={() => setHistoryModal({ open: true, exerciseId: exercise.id, exerciseName: exercise.name })}
                                                                                    className="text-xs sm:text-[12px] font-bold text-slate-400 dark:text-slate-400 truncate hover:text-sky-500 dark:hover:text-sky-400 transition-colors flex items-center gap-0.5 group/hist max-w-full text-left"
                                                                                >
                                                                                    <span className="truncate">
                                                                                        {set.prev_log && set.prev_log !== '-' ? set.prev_log : '-'}
                                                                                    </span>
                                                                                </button>

                                                                                {/* 2. Metas Prescritas pelo Treinador (Linha 2) */}
                                                                                {(set.weight_target || set.reps_target || set.rpe_target) ? (
                                                                                    <div className="flex items-center gap-1 mt-0.5 overflow-hidden">
                                                                                        {set.weight_target && (
                                                                                            <span
                                                                                                title={`Carga alvo: ${set.weight_target} kg`}
                                                                                                className="text-[9px] bg-sky-100/90 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-300/40 dark:border-sky-800/40 px-1 sm:px-1.5 py-0.5 rounded font-bold uppercase tracking-tight flex-shrink-0"
                                                                                            >
                                                                                                {set.weight_target}KG
                                                                                            </span>
                                                                                        )}
                                                                                        {set.reps_target && (
                                                                                            <span
                                                                                                title={`Repetições alvo: ${set.reps_target}`}
                                                                                                className="text-[9px] bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-800/40 px-1 sm:px-1.5 py-0.5 rounded font-bold uppercase tracking-tight flex-shrink-0"
                                                                                            >
                                                                                                {set.reps_target} Reps
                                                                                            </span>
                                                                                        )}
                                                                                        {set.rpe_target && (
                                                                                            <span
                                                                                                title={`Percepção de Esforço PSE: ${set.rpe_target}`}
                                                                                                className="text-[9px] bg-purple-100/90 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300/40 dark:border-purple-800/40 px-1 sm:px-1.5 py-0.5 rounded font-bold uppercase tracking-tight flex-shrink-0"
                                                                                            >
                                                                                                @{set.rpe_target}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                ) : null}
                                                                            </>
                                                                        ) : (
                                                                            <div className="flex flex-wrap items-center gap-0.5 sm:gap-1">
                                                                                {set.time_target && (
                                                                                    <span className="text-[9px] sm:text-[10px] bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tight" title="Tempo alvo">
                                                                                        {formatTimeTarget(set.time_target)}
                                                                                    </span>
                                                                                )}
                                                                                {set.distance_target && (
                                                                                    <span className="text-[9px] sm:text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tight" title="Distância alvo">
                                                                                        {set.distance_target}km
                                                                                    </span>
                                                                                )}
                                                                                {set.speed_target && (
                                                                                    <span className="text-[9px] sm:text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tight" title="Velocidade alvo">
                                                                                        {set.speed_target}km/h
                                                                                    </span>
                                                                                )}
                                                                                {set.hiit_cycles && (
                                                                                    <span className="text-[9px] sm:text-[10px] bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tight" title="Ciclos HIIT">
                                                                                        {set.hiit_cycles}x ({set.hiit_work_seconds}s/{set.hiit_rest_seconds}s)
                                                                                    </span>
                                                                                )}
                                                                                {set.rpe_target && (
                                                                                    <span className="text-[9px] sm:text-[10px] bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tight">PSE {set.rpe_target}</span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Input cols based on exercise type */}
                                                                    {exercise.exercise_type === 'reps' && (
                                                                        <>
                                                                            <div>
                                                                                <input
                                                                                    type="number"
                                                                                    inputMode="decimal"
                                                                                    aria-label={`Carga em kg para série ${setIndex + 1}`}
                                                                                    className={`w-full min-h-[44px] h-11 text-center text-xs sm:text-sm font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:border-sky-500 focus:ring-1 focus:ring-sky-500 px-1 text-slate-900 dark:text-white transition-all shadow-sm ${set.completed ? 'opacity-60' : ''}`}
                                                                                    placeholder={set.prev_log !== '-' ? set.prev_log.split('kg')[0] : (set.weight_target ? String(set.weight_target) : '-')}
                                                                                    value={set.weight}
                                                                                    onChange={(e) => handleInputChange(exIndex, setIndex, 'weight', e.target.value)}
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <input
                                                                                    type="number"
                                                                                    inputMode="numeric"
                                                                                    aria-label={`Repetições para série ${setIndex + 1}`}
                                                                                    className={`w-full min-h-[44px] h-11 text-center text-xs sm:text-sm font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:border-sky-500 focus:ring-1 focus:ring-sky-500 p-0 text-slate-900 dark:text-white transition-all shadow-sm ${set.completed ? 'opacity-60' : ''}`}
                                                                                    placeholder={(() => {
                                                                                        if (set.prev_log && set.prev_log !== '-') {
                                                                                            const parts = set.prev_log.split('x');
                                                                                            if (parts.length > 1) {
                                                                                                const prevReps = parseInt(parts[1].trim());
                                                                                                if (!isNaN(prevReps)) return String(prevReps);
                                                                                            }
                                                                                        }
                                                                                        if (set.reps_target) {
                                                                                            const isRange = String(set.reps_target).includes('-');
                                                                                            if (!isRange) return String(set.reps_target);
                                                                                            const lower = parseFloat(String(set.reps_target));
                                                                                            if (!isNaN(lower)) return String(lower);
                                                                                        }
                                                                                        return '-';
                                                                                    })()}
                                                                                    value={set.reps}
                                                                                    onChange={(e) => handleInputChange(exIndex, setIndex, 'reps', e.target.value)}
                                                                                />
                                                                            </div>
                                                                        </>
                                                                    )}

                                                                    {isHiit ? (
                                                                        <>
                                                                            <div>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setHiitModal({ open: true, exerciseIndex: exIndex, setIndex: setIndex })}
                                                                                    aria-label={`Iniciar cronômetro HIIT para série ${setIndex + 1}`}
                                                                                    className={`w-full min-h-[44px] h-11 rounded-xl bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-all shadow-sm active:scale-95 ${set.completed ? 'opacity-60' : ''}`}
                                                                                    title="Iniciar Cronômetro HIIT"
                                                                                >
                                                                                    <span className="material-symbols-rounded text-base sm:text-lg" aria-hidden="true">play_arrow</span>
                                                                                </button>
                                                                            </div>
                                                                            <div>
                                                                                <input
                                                                                    type="number"
                                                                                    inputMode="numeric"
                                                                                    data-testid="hiit-cycles-completed"
                                                                                    aria-label={`Ciclos HIIT concluídos na série ${setIndex + 1}`}
                                                                                    className={`w-full min-h-[44px] h-11 text-center text-xs sm:text-sm font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:border-sky-500 focus:ring-1 focus:ring-sky-500 p-0 text-slate-900 dark:text-white transition-all shadow-sm ${set.completed ? 'opacity-60' : ''}`}
                                                                                    placeholder={set.hiit_cycles ? String(set.hiit_cycles) : '-'}
                                                                                    value={set.hiit_cycles_completed || ''}
                                                                                    onChange={(e) => handleInputChange(exIndex, setIndex, 'hiit_cycles_completed', e.target.value)}
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <select
                                                                                    aria-label={`Tempo HIIT na série ${setIndex + 1}`}
                                                                                    className={`w-full min-h-[44px] h-11 text-center text-xs sm:text-sm font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:border-sky-500 focus:ring-1 focus:ring-sky-500 p-0 text-slate-900 dark:text-white transition-all shadow-sm ${set.completed ? 'opacity-60' : ''}`}
                                                                                    value={set.time_completed || ''}
                                                                                    onChange={(e) => handleInputChange(exIndex, setIndex, 'time_completed', e.target.value)}
                                                                                >
                                                                                    <option value="">-</option>
                                                                                    {generateTimeOptions(set.time_target || undefined).map(opt => (
                                                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            {exercise.exercise_type === 'time' && (
                                                                                <div className="flex items-center gap-1 w-full">
                                                                                    <input
                                                                                        type="number"
                                                                                        inputMode="numeric"
                                                                                        aria-label={`Tempo em segundos na série ${setIndex + 1}`}
                                                                                        className={`w-full min-h-[44px] h-11 text-center text-xs sm:text-sm font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:border-sky-500 focus:ring-1 focus:ring-sky-500 p-0 text-slate-900 dark:text-white transition-all shadow-sm ${set.completed ? 'opacity-60' : ''}`}
                                                                                        placeholder={set.time_target ? String(set.time_target) : '-'}
                                                                                        value={set.time_completed || ''}
                                                                                        onChange={(e) => handleInputChange(exIndex, setIndex, 'time_completed', e.target.value)}
                                                                                    />
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => setActiveTimerSet({ exIndex, setIndex, seconds: 0, isRunning: true })}
                                                                                        aria-label={`Iniciar cronômetro para série ${setIndex + 1}`}
                                                                                        className={`w-11 h-11 min-w-[44px] min-h-[44px] p-2 rounded-xl bg-primary hover:bg-sky-600 text-white flex items-center justify-center transition-all shadow-sm active:scale-95 shrink-0 ${set.completed ? 'opacity-60' : ''}`}
                                                                                        title="Iniciar Cronômetro"
                                                                                    >
                                                                                        <span className="material-symbols-rounded text-base" aria-hidden="true">timer</span>
                                                                                    </button>
                                                                                </div>
                                                                            )}

                                                                            {exercise.exercise_type === 'cardio' && (
                                                                                <>
                                                                                    <div className="flex items-center gap-1 w-full">
                                                                                        <select
                                                                                            aria-label={`Tempo de cardio na série ${setIndex + 1}`}
                                                                                            className={`w-full min-h-[44px] h-11 text-center text-xs sm:text-sm font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:border-sky-500 focus:ring-1 focus:ring-sky-500 p-0 text-slate-900 dark:text-white transition-all shadow-sm ${set.completed ? 'opacity-60' : ''}`}
                                                                                            value={set.time_completed || ''}
                                                                                            onChange={(e) => handleInputChange(exIndex, setIndex, 'time_completed', e.target.value)}
                                                                                        >
                                                                                            <option value="">-</option>
                                                                                            {generateTimeOptions(set.time_target || undefined).map(opt => (
                                                                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                                            ))}
                                                                                        </select>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => setActiveTimerSet({ exIndex, setIndex, seconds: 0, isRunning: true })}
                                                                                            aria-label={`Iniciar cronômetro de cardio para série ${setIndex + 1}`}
                                                                                            className={`w-11 h-11 min-w-[44px] min-h-[44px] p-2 rounded-xl bg-primary hover:bg-sky-600 text-white flex items-center justify-center transition-all shadow-sm active:scale-95 shrink-0 ${set.completed ? 'opacity-60' : ''}`}
                                                                                            title="Iniciar Cronômetro"
                                                                                        >
                                                                                            <span className="material-symbols-rounded text-base" aria-hidden="true">timer</span>
                                                                                        </button>
                                                                                    </div>
                                                                                    <div>
                                                                                        <input
                                                                                            type="number"
                                                                                            inputMode="decimal"
                                                                                            data-testid="distance-completed"
                                                                                            aria-label={`Distância em km na série ${setIndex + 1}`}
                                                                                            className={`w-full min-h-[44px] h-11 text-center text-xs sm:text-sm font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:border-sky-500 focus:ring-1 focus:ring-sky-500 p-0 text-slate-900 dark:text-white transition-all shadow-sm ${set.completed ? 'opacity-60' : ''}`}
                                                                                            placeholder={set.distance_target ? String(set.distance_target) : '-'}
                                                                                            value={set.distance_completed || ''}
                                                                                            onChange={(e) => handleInputChange(exIndex, setIndex, 'distance_completed', e.target.value)}
                                                                                        />
                                                                                    </div>
                                                                                    <div>
                                                                                        <input
                                                                                            type="number"
                                                                                            inputMode="decimal"
                                                                                            data-testid="speed-actual"
                                                                                            aria-label={`Velocidade em km/h na série ${setIndex + 1}`}
                                                                                            className={`w-full min-h-[44px] h-11 text-center text-xs sm:text-sm font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:border-sky-500 focus:ring-1 focus:ring-sky-500 p-0 text-slate-900 dark:text-white transition-all shadow-sm ${set.completed ? 'opacity-60' : ''}`}
                                                                                            placeholder={set.speed_target ? String(set.speed_target) : '-'}
                                                                                            value={set.speed_actual || ''}
                                                                                            onChange={(e) => handleInputChange(exIndex, setIndex, 'speed_actual', e.target.value)}
                                                                                        />
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </>
                                                                    )}

                                                                    {/* RPE col */}
                                                                    <div className="min-w-0 flex items-center justify-center">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setPseModal({ open: true, exerciseIndex: exIndex, setIndex: setIndex })}
                                                                            aria-label={`Definir PSE para série ${setIndex + 1}`}
                                                                            className={`w-full min-h-[44px] h-9 sm:h-10 px-0.5 rounded-lg sm:rounded-xl flex items-center justify-center text-[10px] sm:text-[11px] font-black tracking-tight whitespace-nowrap overflow-hidden transition-all border shrink-0 ${set.rpe
                                                                                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700/60 shadow-sm ring-1 ring-sky-400/20'
                                                                                : set.rpe_target
                                                                                    ? 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-600'
                                                                                    : 'bg-slate-50/80 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-dashed border-slate-200 dark:border-slate-700/80 hover:text-sky-500 hover:border-sky-300 dark:hover:border-sky-600'
                                                                                } ${set.completed ? 'opacity-60' : ''}`}
                                                                        >
                                                                            {set.rpe ? `@${set.rpe}` : (set.rpe_target ? `@${set.rpe_target}` : '@')}
                                                                        </button>
                                                                    </div>

                                                                    {/* Check col */}
                                                                    <div className="flex justify-center min-w-0">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleSetCompletion(exIndex, setIndex)}
                                                                            data-testid={`complete-set-${setIndex}`}
                                                                            aria-label={set.completed ? `Desmarcar série ${setIndex + 1} de ${exercise.name}` : `Concluir série ${setIndex + 1} de ${exercise.name}`}
                                                                            className={`min-w-[36px] w-full min-h-[44px] h-11 rounded-xl flex items-center justify-center transition-colors shrink-0 ${set.completed
                                                                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/20'
                                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                                                }`}
                                                                        >
                                                                            <span className="material-symbols-rounded text-lg sm:text-2xl" aria-hidden="true">check</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        });
                                                    })()
                                                }
                                            </div>

                                            {/* Exercise Feedback */}
                                            <div className="p-3 sm:p-4 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-700/50 transition-colors">
                                                <label htmlFor={`feedback-${exercise.id}`} className="flex items-center gap-1.5 mb-2 px-1 text-slate-500 dark:text-slate-400 cursor-pointer">
                                                    <span className="material-symbols-rounded text-base" aria-hidden="true">chat_bubble</span>
                                                    <span className="text-[10px] font-extrabold uppercase tracking-widest">Feedback do Exercício</span>
                                                </label>
                                                <textarea
                                                    id={`feedback-${exercise.id}`}
                                                    value={exercise.feedback || ''}
                                                    data-testid={`feedback-${exercise.id}`}
                                                    aria-label={`Feedback sobre a execução do exercício ${exercise.name}`}
                                                    onChange={(e) => {
                                                        const newExercises = [...exercises];
                                                        newExercises[exIndex].feedback = e.target.value;
                                                        setExercises(newExercises);
                                                        saveToLocalStorage(newExercises);
                                                    }}
                                                    placeholder="Feedback: Como foi a execução deste exercício?..."
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 min-h-[60px] transition-all resize-none shadow-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Compact Floating Rest Timer */}
                    {
                        toastVisible && (
                            <div className="fixed bottom-20 sm:bottom-24 left-3 right-3 max-w-sm sm:max-w-md mx-auto z-[90] animate-slide-up" role="region" aria-label="Cronômetro de descanso">
                                <div className={`backdrop-blur-xl px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full sm:rounded-[2rem] shadow-2xl border transition-colors duration-300 flex items-center justify-between gap-2 sm:gap-3 ${timeLeft === 0 ? 'bg-emerald-950/95 border-emerald-500/40 shadow-emerald-950/50' : 'bg-slate-900/95 dark:bg-slate-900/95 border-white/10 shadow-black/50 text-white'}`}>
                                    {/* Left side: Icon + Text */}
                                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center relative overflow-hidden shrink-0 transition-colors ${timeLeft === 0 ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'bg-sky-500/20'}`}>
                                            {timeLeft > 0 && (
                                                <div
                                                    className="absolute bottom-0 left-0 right-0 bg-sky-500/40 transition-all duration-300 ease-linear origin-bottom"
                                                    style={{ height: `${initialTime > 0 ? (timeLeft / initialTime) * 100 : 0}%` }}
                                                ></div>
                                            )}
                                            <span className="material-symbols-rounded text-xl sm:text-2xl relative z-10 text-white" aria-hidden="true">
                                                {timeLeft === 0 ? 'check' : 'timer'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate ${timeLeft === 0 ? 'text-emerald-300' : 'text-slate-400'}`}>
                                                {timeLeft === 0 ? 'Descanso Concluído' : 'Descanso'}
                                            </span>
                                            <span className={`font-mono text-xl sm:text-2xl font-black tabular-nums leading-none tracking-tight ${timeLeft === 0 ? 'text-white text-base sm:text-lg' : 'text-white'}`}>
                                                {timeLeft === 0 ? '+15s?' : formatTime(timeLeft)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Right side: Action Buttons */}
                                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                        {timeLeft > 0 ? (
                                            <>
                                                <div className="flex items-center bg-white/10 rounded-xl p-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => addTime(-15)}
                                                        aria-label="Diminuir 15 segundos do descanso"
                                                        className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-white hover:text-sky-400 active:scale-90 transition-transform"
                                                    >
                                                        <span className="material-symbols-rounded text-base sm:text-lg" aria-hidden="true">remove</span>
                                                    </button>
                                                    <div className="w-[1px] h-4 bg-white/15"></div>
                                                    <button
                                                        type="button"
                                                        onClick={() => addTime(15)}
                                                        aria-label="Adicionar 15 segundos ao descanso"
                                                        className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-white hover:text-sky-400 active:scale-90 transition-transform"
                                                    >
                                                        <span className="material-symbols-rounded text-base sm:text-lg" aria-hidden="true">add</span>
                                                    </button>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={stopRestTimer}
                                                    aria-label="Pular descanso e continuar treino"
                                                    className="h-9 sm:h-10 px-3.5 sm:px-4 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl shadow-md shadow-sky-500/25 active:scale-95 transition-all text-xs whitespace-nowrap flex items-center justify-center"
                                                >
                                                    Pular
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => addTime(15)}
                                                    aria-label="Adicionar 15 segundos extras de descanso"
                                                    className="h-9 sm:h-10 px-2.5 sm:px-3 bg-emerald-800/60 hover:bg-emerald-800 text-emerald-100 font-bold rounded-xl border border-emerald-500/30 text-xs active:scale-95 transition-all shrink-0"
                                                >
                                                    +15s
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={stopRestTimer}
                                                    aria-label="Pular descanso e ir para a próxima série"
                                                    className="h-9 sm:h-10 px-3 sm:px-4 bg-white hover:bg-slate-100 text-emerald-700 font-bold rounded-xl shadow-md active:scale-95 transition-all text-xs whitespace-nowrap flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                                                >
                                                    Próx. Série
                                                    <span className="material-symbols-rounded text-sm sm:text-base" aria-hidden="true">arrow_forward</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </div >

                <HIITExecutionModal
                    isOpen={hiitModal.open}
                    onClose={() => setHiitModal({ open: false, exerciseIndex: null, setIndex: null })}
                    workSeconds={hiitModal.exerciseIndex !== null && hiitModal.setIndex !== null ? (exercises[hiitModal.exerciseIndex]?.sets?.[hiitModal.setIndex]?.hiit_work_seconds || 30) : 30}
                    restSeconds={hiitModal.exerciseIndex !== null && hiitModal.setIndex !== null ? (exercises[hiitModal.exerciseIndex]?.sets?.[hiitModal.setIndex]?.hiit_rest_seconds || 30) : 30}
                    cycles={hiitModal.exerciseIndex !== null && hiitModal.setIndex !== null ? (exercises[hiitModal.exerciseIndex]?.sets?.[hiitModal.setIndex]?.hiit_cycles || 8) : 8}
                    exerciseName={hiitModal.exerciseIndex !== null ? (exercises[hiitModal.exerciseIndex]?.name || '') : ''}
                    playBeepFn={playTransitionBeep}
                    workSpeed={hiitModal.exerciseIndex !== null && hiitModal.setIndex !== null ? (Number(exercises[hiitModal.exerciseIndex]?.sets?.[hiitModal.setIndex]?.hiit_work_speed) || undefined) : undefined}
                    restSpeed={hiitModal.exerciseIndex !== null && hiitModal.setIndex !== null ? (Number(exercises[hiitModal.exerciseIndex]?.sets?.[hiitModal.setIndex]?.hiit_rest_speed) || undefined) : undefined}
                    onComplete={(cyclesCompleted, totalSeconds) => {
                        if (hiitModal.exerciseIndex !== null && hiitModal.setIndex !== null) {
                            const exIdx = hiitModal.exerciseIndex;
                            const setIdx = hiitModal.setIndex;
                            const newExercises = [...exercises];
                            const currentSet = { ...newExercises[exIdx].sets[setIdx] };
                            currentSet.hiit_cycles_completed = String(cyclesCompleted);
                            currentSet.time_completed = String(totalSeconds);
                            currentSet.completed = true;

                            newExercises[exIdx].sets[setIdx] = currentSet;
                            setExercises(newExercises);
                            saveToLocalStorage(newExercises);

                            setHiitModal({ open: false, exerciseIndex: null, setIndex: null });
                            toast.success('HIIT concluído e salvo!');

                            // Trigger rest timer
                            startRestTimer(currentSet.rest_seconds);
                        }
                    }}
                />

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
                <RPESelectorModal
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
                <RPEGuideModal
                    isOpen={rpeGuideOpen}
                    onClose={() => setRpeGuideOpen(false)}
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

                {/* Cardio/Time Active Timer Modal */}
                {activeTimerSet && (
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Cronômetro da Série ${activeTimerSet.setIndex + 1} de ${exercises[activeTimerSet.exIndex]?.name || 'exercício'}`}
                        className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
                    >
                        <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl border border-white/10 dark:border-slate-100 flex flex-col items-center gap-6 animate-slide-up">
                            <div className="text-center w-full">
                                <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest block mb-1">
                                    Cronômetro de Série
                                </span>
                                <h3 className="text-lg font-bold truncate px-4">
                                    {exercises[activeTimerSet.exIndex].name}
                                </h3>
                                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">
                                    Série {activeTimerSet.setIndex + 1}
                                </p>
                            </div>

                            {/* Tempo Gigante */}
                            <div className="w-48 h-48 rounded-full border-4 border-sky-500/30 flex items-center justify-center relative my-2 bg-slate-950/50 dark:bg-slate-50" aria-label={`Tempo decorrido: ${formatWorkoutDuration(activeTimerSet.seconds)}`}>
                                <span className="text-4xl font-black font-mono tracking-wider tabular-nums">
                                    {formatWorkoutDuration(activeTimerSet.seconds)}
                                </span>
                                <div className="absolute inset-2 rounded-full border border-sky-500/10 animate-pulse pointer-events-none"></div>
                            </div>

                            {/* Botões de Ação */}
                            <div className="flex items-center gap-4 w-full justify-center">
                                {/* Resetar */}
                                <button
                                    type="button"
                                    onClick={() => setActiveTimerSet(prev => prev ? { ...prev, seconds: 0 } : null)}
                                    aria-label="Zerar cronômetro da série"
                                    className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-slate-800 dark:bg-slate-100 hover:bg-slate-700 dark:hover:bg-slate-200 text-slate-400 dark:text-slate-600 flex items-center justify-center transition-colors active:scale-95 shadow-sm"
                                    title="Resetar"
                                >
                                    <span className="material-symbols-rounded text-xl" aria-hidden="true">replay</span>
                                </button>

                                {/* Iniciar / Pausar */}
                                <button
                                    type="button"
                                    onClick={() => setActiveTimerSet(prev => prev ? { ...prev, isRunning: !prev.isRunning } : null)}
                                    aria-label={activeTimerSet.isRunning ? "Pausar cronômetro" : "Iniciar cronômetro"}
                                    className={`w-16 h-16 min-w-[64px] min-h-[64px] rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg ${activeTimerSet.isRunning ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20' : 'bg-primary hover:bg-sky-600 text-white shadow-sky-500/20'}`}
                                >
                                    <span className="material-symbols-rounded text-3xl" aria-hidden="true">
                                        {activeTimerSet.isRunning ? 'pause' : 'play_arrow'}
                                    </span>
                                </button>

                                {/* Cancelar / Fechar */}
                                <button
                                    type="button"
                                    onClick={() => setActiveTimerSet(null)}
                                    aria-label="Fechar cronômetro sem salvar"
                                    className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-slate-800 dark:bg-slate-100 hover:bg-slate-700 dark:hover:bg-slate-200 text-slate-400 dark:text-slate-600 flex items-center justify-center transition-colors active:scale-95 shadow-sm"
                                    title="Cancelar"
                                >
                                    <span className="material-symbols-rounded text-xl" aria-hidden="true">close</span>
                                </button>
                            </div>

                            {/* Registrar */}
                            <button
                                type="button"
                                onClick={handleSaveTimerTime}
                                aria-label="Registrar tempo e concluir série"
                                className="w-full min-h-[44px] py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-98 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-rounded text-xl" aria-hidden="true">check_circle</span>
                                Registrar & Concluir Série
                            </button>
                        </div>
                    </div>
                )}

                {/* Generic Explanation Modal */}
                {explanationModal.open && (
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label={explanationModal.title}
                        className="fixed inset-0 z-[220] bg-black/80 flex items-center justify-center p-4 animate-fade-in"
                        onClick={() => setExplanationModal({ ...explanationModal, open: false })}
                    >
                        <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl animate-scale-up max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-3 shrink-0">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{explanationModal.title}</h3>
                                <button
                                    type="button"
                                    onClick={() => setExplanationModal({ ...explanationModal, open: false })}
                                    aria-label="Fechar janela informativa"
                                    className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                >
                                    <span className="material-symbols-rounded" aria-hidden="true">close</span>
                                </button>
                            </div>
                            <div className="overflow-y-auto pr-1 flex-1">
                                {explanationModal.content ? (
                                    explanationModal.content
                                ) : (
                                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                        {explanationModal.text}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

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
}> = React.memo(({ isOpen, onClose, onConfirm, comment, onCommentChange }) => {
    const [effort, setEffort] = useState(7);

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Finalizar e avaliar treino"
            className="fixed inset-0 z-[300] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={onClose}
        >
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-t-[32px] sm:rounded-3xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6 sm:hidden"></div>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-sky-50 dark:bg-sky-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-sky-100 dark:border-sky-500/10">
                        <span className="material-symbols-rounded text-3xl text-sky-500" aria-hidden="true">task_alt</span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Finalizar Treino?</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Como você avalia o esforço total deste treino?</p>
                </div>

                <div className="space-y-6 mb-8">
                    <div className="flex justify-between items-end px-2">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Leve</span>
                        <span className="text-4xl font-black text-sky-500 tabular-nums">{effort}</span>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Máximo</span>
                    </div>

                    <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={effort}
                        aria-label="Escala de esforço de 1 a 10"
                        onChange={(e) => setEffort(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500 min-h-[44px]"
                    />

                    <div className="grid grid-cols-5 gap-2 px-1 justify-items-center">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                            <button
                                key={n}
                                type="button"
                                data-testid={`effort-rating-${n}`}
                                aria-label={`Nota de esforço ${n} de 10`}
                                onClick={() => {
                                    setEffort(n);
                                    onConfirm(n);
                                }}
                                className={`w-full h-11 min-h-[44px] rounded-xl flex items-center justify-center font-bold text-sm transition-all active:scale-95 cursor-pointer ${n === effort
                                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20 scale-105 ring-2 ring-sky-500 ring-offset-2 dark:ring-offset-slate-800'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                                    }`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>

                    <div className="mt-6">
                        <label htmlFor="workout-comment" className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2 px-1">Comentários Adicionais</label>
                        <textarea
                            id="workout-comment"
                            value={comment}
                            onChange={(e) => onCommentChange(e.target.value)}
                            placeholder="Como você se sentiu hoje? Cargas fáceis? Alguma dor?"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 min-h-[100px] transition-all resize-none"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        type="button"
                        onClick={() => onConfirm(effort)}
                        aria-label="Salvar e finalizar treino"
                        className="w-full min-h-[44px] bg-sky-500 hover:bg-sky-600 text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-rounded" aria-hidden="true">check_circle</span>
                        Salvar e Finalizar
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Continuar treinando"
                        className="w-full min-h-[44px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center"
                    >
                        Continuar Treinando
                    </button>
                </div>
            </div>
        </div>
    );
});

const RPESelectorModal: React.FC<{ isOpen: boolean, onClose: () => void, onSelect: (pse: string) => void, currentValue?: string }> = React.memo(({ isOpen, onClose, onSelect, currentValue }) => {
    if (!isOpen) return null;

    // Escala completa com valores intermediários (igual ao que o coach pode definir)
    const rpeValues = [0, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Guia da Escala de Esforço Percebido PSE"
            className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Escala de Esforço (PSE)</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar guia de esforço"
                        className="min-w-[44px] min-h-[44px] p-2 -mr-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
                    >
                        <span className="material-symbols-rounded" aria-hidden="true">close</span>
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
                                type="button"
                                onClick={() => onSelect(strVal)}
                                aria-label={`Selecionar PSE ${n}`}
                                className={`min-h-[44px] rounded-xl font-bold text-sm transition-all ${isSelected
                                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20 scale-105 ring-2 ring-sky-500 ring-offset-2 dark:ring-offset-slate-800'
                                    : isHigh
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
                                        : isMedHigh
                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                                            : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                                    } hover:scale-105 active:scale-95 flex items-center justify-center`}
                            >
                                {n}
                            </button>
                        );
                    })}
                </div>
                <p className="mt-4 text-[10px] text-slate-500 dark:text-slate-400 text-center uppercase tracking-widest font-bold">5-6 = Aquecimento | 10 = Falha Total</p>

                <div className="mt-6 space-y-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                    <div className="flex gap-3 items-center">
                        <span className="font-bold text-sky-500 w-10 text-right">9-10</span>
                        <p className="text-xs text-slate-600 dark:text-slate-300 flex-1">Extremamente difícil. <span className="font-bold">10 é falha total</span> (não consegue mais mover a carga).</p>
                    </div>
                    <div className="flex gap-3 items-center">
                        <span className="font-bold text-sky-500 w-10 text-right">7-8</span>
                        <p className="text-xs text-slate-600 dark:text-slate-300 flex-1">Difícil. Sobrariam 1 a 3 repetições (RIR 1-3).</p>
                    </div>
                    <div className="flex gap-3 items-center">
                        <span className="font-bold text-sky-500 w-10 text-right">5-6</span>
                        <p className="text-xs text-slate-600 dark:text-slate-300 flex-1">Médio/Moderado. Carga de aquecimento ou técnica.</p>
                    </div>
                </div>
            </div>
        </div>
    );
});

const SeriesHelpModal: React.FC<{ isOpen: boolean, onClose: () => void }> = React.memo(({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Tipos de Séries e Nomenclatura"
            className="fixed inset-0 z-[210] bg-black/80 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Tipos de Séries</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar guia de tipos de séries"
                        className="min-w-[44px] min-h-[44px] p-2 -mr-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
                    >
                        <span className="material-symbols-rounded" aria-hidden="true">close</span>
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="flex gap-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
                        <span className="material-symbols-rounded text-amber-600 text-2xl shrink-0" aria-hidden="true">local_fire_department</span>
                        <div>
                            <h4 className="font-bold text-amber-950 dark:text-amber-200 text-sm">Aquecimento (Warm-up)</h4>
                            <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80 leading-relaxed">Séries com carga leve para preparar as articulações e o sistema nervoso. Não contam para o volume total de trabalho.</p>
                        </div>
                    </div>

                    <div className="flex gap-4 p-3 rounded-2xl bg-cyan-50 dark:bg-cyan-900/10 border border-cyan-100 dark:border-cyan-900/20">
                        <span className="material-symbols-rounded text-cyan-600 text-2xl shrink-0" aria-hidden="true">publish</span>
                        <div>
                            <h4 className="font-bold text-cyan-950 dark:text-cyan-200 text-sm">Preparação (Feeder)</h4>
                            <p className="text-[11px] text-cyan-900/80 dark:text-cyan-300/80 leading-relaxed">Séries com poucas repetições para aclimatar com a carga, sem gerar fadiga. Aumente a carga gradualmente até a carga de trabalho.</p>
                        </div>
                    </div>

                    <div className="flex gap-4 p-3 rounded-2xl bg-sky-50 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-900/20">
                        <div className="w-6 h-6 rounded bg-sky-500 flex items-center justify-center text-[10px] font-black text-white shrink-0">1</div>
                        <div>
                            <h4 className="font-bold text-sky-950 dark:text-sky-200 text-sm">Série de Trabalho</h4>
                            <p className="text-[11px] text-sky-900/80 dark:text-sky-300/80 leading-relaxed">Séries efetivas onde o objetivo é atingir a carga e repetições prescritas pelo treinador.</p>
                        </div>
                    </div>

                    <div className="flex gap-4 p-3 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                        <span className="material-symbols-rounded text-red-600 text-2xl shrink-0" aria-hidden="true">bolt</span>
                        <div>
                            <h4 className="font-bold text-red-950 dark:text-red-200 text-sm">Até a Falha (All-out)</h4>
                            <p className="text-[11px] text-red-900/80 dark:text-red-300/80 leading-relaxed">Executar o máximo de repetições possíveis com a carga selecionada, mantendo a forma correta.</p>
                        </div>
                    </div>

                    <div className="flex gap-4 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <span className="material-symbols-rounded text-sky-600 dark:text-sky-400 text-2xl shrink-0" aria-hidden="true">layers</span>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Drop-set</h4>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">Reduzir a carga sem intervalo após a falha para continuar as repetições.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

const HIITExecutionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    workSeconds: number;
    restSeconds: number;
    cycles: number;
    exerciseName: string;
    onComplete: (cyclesCompleted: number, totalSeconds: number) => void;
    playBeepFn: (type: 'to_work' | 'to_rest' | 'finished') => void;
    workSpeed?: number;
    restSpeed?: number;
}> = ({ isOpen, onClose, workSeconds, restSeconds, cycles, exerciseName, onComplete, playBeepFn, workSpeed, restSpeed }) => {
    const [phase, setPhase] = useState<'prep' | 'work' | 'rest' | 'finished'>('prep');
    const [currentCycle, setCurrentCycle] = useState(1);
    const [timeLeft, setTimeLeft] = useState(5);
    const [isActive, setIsActive] = useState(true);
    const [flash, setFlash] = useState(false);

    // Trava de tempo contra cliques fantasmas (Ghost Clicks) em mobile
    const [mountedTime, setMountedTime] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setMountedTime(Date.now());
            setPhase('prep');
            setCurrentCycle(1);
            setTimeLeft(5);
            setIsActive(true);
            setFlash(false);
        }
    }, [isOpen]);

    const handleCloseSafe = () => {
        // Ignora chamadas de fechamento síncronas que aconteçam nos primeiros 500ms
        if (Date.now() - mountedTime < 500) {
            console.log('Ghost click evitado no HIIT modal');
            return;
        }
        onClose();
    };

    const triggerFlash = () => {
        setFlash(true);
        setTimeout(() => setFlash(false), 300);
    };

    useEffect(() => {
        if (!isOpen || !isActive || phase === 'finished') return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (phase === 'prep') {
                        // Ir para descanso (velocidade mais baixa) primeiro!
                        setPhase('rest');
                        triggerFlash();
                        playBeepFn('to_rest');
                        return restSeconds;
                    } else if (phase === 'rest') {
                        // Do descanso vai para o tiro
                        setPhase('work');
                        triggerFlash();
                        playBeepFn('to_work');
                        return workSeconds;
                    } else if (phase === 'work') {
                        // Do tiro vai para o descanso OU finaliza
                        if (currentCycle >= cycles) {
                            setPhase('finished');
                            playBeepFn('finished');
                            return 0;
                        } else {
                            setCurrentCycle(c => c + 1);
                            setPhase('rest');
                            triggerFlash();
                            playBeepFn('to_rest');
                            return restSeconds;
                        }
                    }
                }
                if (prev <= 4 && prev > 1 && (phase === 'prep' || phase === 'rest')) {
                    playBeepFn('to_rest');
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, isActive, phase, currentCycle, workSeconds, restSeconds, cycles]);

    if (!isOpen) return null;

    const getBgColor = () => {
        if (phase === 'prep') return 'bg-amber-500 text-white';
        if (phase === 'work') return 'bg-red-600 text-white animate-pulse';
        if (phase === 'rest') return 'bg-sky-600 text-white';
        return 'bg-emerald-600 text-white';
    };

    const getPhaseName = () => {
        if (phase === 'prep') return 'PREPARAÇÃO';
        if (phase === 'work') return 'TRABALHO (TIRO!)';
        if (phase === 'rest') return 'DESCANSO';
        return 'HIIT CONCLUÍDO!';
    };

    const formatSeconds = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleSave = () => {
        const completed = phase === 'finished' ? cycles : (phase === 'rest' ? currentCycle : currentCycle - 1);
        const totalSecs = completed * (workSeconds + restSeconds);
        onComplete(completed, totalSecs);
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Execução de treino intervalado HIIT"
            className="fixed inset-0 z-[400] bg-black/90 flex items-center justify-center p-4"
        >
            <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl transition-colors duration-500 overflow-hidden relative ${getBgColor()}`}>
                {flash && <div className="absolute inset-0 bg-white opacity-40 z-50 pointer-events-none" />}

                <div className="flex justify-between items-center mb-6 relative z-10">
                    <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full text-white">HIIT</span>
                    </div>
                    <button
                        type="button"
                        onClick={handleCloseSafe}
                        aria-label="Fechar execução HIIT"
                        className="min-w-[44px] min-h-[44px] p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
                    >
                        <span className="material-symbols-rounded" aria-hidden="true">close</span>
                    </button>
                </div>

                <div className="text-center space-y-6 my-10 relative z-10">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/80">{exerciseName}</p>

                    {phase !== 'finished' ? (
                        <>
                            <h3 className="text-xl font-black tracking-wide">{getPhaseName()}</h3>
                            <div className="text-7xl font-black font-mono tabular-nums tracking-tighter drop-shadow-md">
                                {formatSeconds(timeLeft)}
                            </div>

                            {/* Velocidade Alvo Prominente */}
                            <div className="my-2 bg-black/20 border border-white/10 px-5 py-3 rounded-2xl inline-flex flex-col items-center shadow-lg w-full max-w-[280px]">
                                <span className="text-[9px] font-extrabold text-white/60 tracking-widest uppercase mb-1">
                                    {phase === 'prep' ? 'AQUECIMENTO INICIAL' : phase === 'work' ? 'VELOCIDADE DE TIRO' : 'CAMINHADA / DESCANSO'}
                                </span>
                                <span className="text-white text-3xl font-extrabold font-mono animate-pulse">
                                    {phase === 'prep'
                                        ? (restSpeed ? `${restSpeed} km/h` : 'Caminhada leve')
                                        : phase === 'work'
                                            ? (workSpeed ? `${workSpeed} km/h` : 'Tiro Rápido!')
                                            : (restSpeed ? `${restSpeed} km/h` : 'Caminhada leve')
                                    }
                                </span>
                            </div>

                            <div className="text-lg font-bold bg-white/10 py-2 px-4 rounded-2xl inline-block mt-2">
                                Ciclo {currentCycle} de {cycles}
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <span className="material-symbols-rounded text-6xl text-white transition-transform duration-300 scale-105" aria-hidden="true">emoji_events</span>
                            <h3 className="text-3xl font-black">Excelente Trabalho!</h3>
                            <p className="text-sm text-white/80">Você completou todos os {cycles} ciclos.</p>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3 mt-8 relative z-10">
                    {phase !== 'finished' ? (
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setIsActive(a => !a)}
                                aria-label={isActive ? "Pausar cronômetro HIIT" : "Retomar cronômetro HIIT"}
                                className="flex-1 min-h-[44px] bg-white text-slate-900 font-bold py-4 rounded-2xl hover:bg-slate-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm shadow-md"
                            >
                                <span className="material-symbols-rounded" aria-hidden="true">{isActive ? 'pause' : 'play_arrow'}</span>
                                {isActive ? 'Pausar' : 'Retomar'}
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                aria-label="Salvar ciclos completados até agora"
                                className="flex-1 min-h-[44px] bg-white/20 text-white border border-white/30 font-bold py-4 rounded-2xl hover:bg-white/30 transition-all active:scale-[0.98] text-sm flex items-center justify-center"
                            >
                                Salvar Parcial
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSave}
                            aria-label="Concluir e registrar treino HIIT"
                            className="w-full min-h-[44px] bg-white text-emerald-800 font-bold py-4 rounded-2xl hover:bg-slate-50 transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-rounded" aria-hidden="true">check_circle</span>
                            Concluir e Salvar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WorkoutExecution;
