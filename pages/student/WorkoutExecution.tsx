import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { Link, useNavigate } from 'react-router-dom';

interface SetData {
    id: number;
    type: 'W' | '1' | '2' | 'F' | 'D';
    prev: string;
    kg: string;
    reps: string;
    rpe: string;
    rest: number;
    completed: boolean;
}

interface Exercise {
    id: number;
    name: string;
    videoUrl: string;
    notes?: string;
    sets: SetData[];
}

const WorkoutExecution: React.FC = () => {
    const navigate = useNavigate();

    // Mock Data
    const [exercises, setExercises] = useState<Exercise[]>([
        {
            id: 1,
            name: "Puxada Alta - Pegada Triângulo",
            videoUrl: "#",
            notes: "Controlar a descida, 3s na excentrica",
            sets: [
                { id: 1, type: 'W', prev: '31.5kg x 12', kg: '', reps: '', rpe: '', rest: 60, completed: false },
                { id: 2, type: 'W', prev: '58.5kg x 6', kg: '', reps: '', rpe: '', rest: 60, completed: false },
                { id: 3, type: '1', prev: '79kg x 8', kg: '79', reps: '6-10', rpe: '', rest: 90, completed: false },
                { id: 4, type: '2', prev: '79kg x 8', kg: '79', reps: '6-10', rpe: '', rest: 90, completed: false },
            ]
        },
        {
            id: 2,
            name: "Supino Inclinado Na Máquina",
            videoUrl: "#",
            notes: "Focar na contração de pico",
            sets: [
                { id: 5, type: 'W', prev: '40kg x 8', kg: '', reps: '', rpe: '', rest: 60, completed: false },
                { id: 6, type: '1', prev: '90kg x 7', kg: '90', reps: '6-10', rpe: '9', rest: 120, completed: false },
                { id: 7, type: 'F', prev: '90kg x 8', kg: '90', reps: '6-10', rpe: '10', rest: 120, completed: false },
            ]
        }
    ]);

    // Timer State
    const [timerActive, setTimerActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);
    const [toastVisible, setToastVisible] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // PSE Modal State
    const [pseModalOpen, setPseModalOpen] = useState(false);
    const [selectedSetId, setSelectedSetId] = useState<number | null>(null);

    const startRestTimer = (duration: number) => {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeLeft(duration);
        setTimerActive(true);
        setToastVisible(true);

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    stopRestTimer();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const stopRestTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimerActive(false);
        setToastVisible(false);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const toggleSetCompletion = (exerciseIndex: number, setIndex: number, restTime: number) => {
        const newExercises = [...exercises];
        const set = newExercises[exerciseIndex].sets[setIndex];

        set.completed = !set.completed;
        setExercises(newExercises);

        if (set.completed) {
            startRestTimer(restTime);
        } else {
            // Se desmarcar, talvez parar o timer? Por enquanto deixo rolando ou o user para manual.
        }
    };

    const openPseModal = (setId: number) => {
        setSelectedSetId(setId);
        setPseModalOpen(true);
    };

    const closePseModal = () => {
        setPseModalOpen(false);
        setSelectedSetId(null);
    };

    const selectPse = (value: number) => {
        if (selectedSetId !== null) {
            const newExercises = exercises.map(ex => ({
                ...ex,
                sets: ex.sets.map(s => s.id === selectedSetId ? { ...s, rpe: value.toString() } : s)
            }));
            setExercises(newExercises);
        }
        closePseModal();
    };

    const handleInputChange = (exerciseId: number, setId: number, field: 'kg' | 'reps', value: string) => {
        const newExercises = exercises.map(ex => {
            if (ex.id !== exerciseId) return ex;
            return {
                ...ex,
                sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: value } : s)
            };
        });
        setExercises(newExercises);
    };

    return (
        <MainLayout className="pb-24 relative">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                <div className="px-4 py-3 flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <span className="material-symbols-rounded">expand_more</span>
                    </button>
                    <div className="flex-1 px-2 text-center">
                        <h1 className="text-base font-bold text-slate-900 dark:text-white truncate">Upper I</h1>
                    </div>
                    <button className="bg-primary hover:bg-primary-dark text-white px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors shadow-sm active:scale-95">
                        Concluir
                    </button>
                </div>
            </header>

            <main className="px-4 py-4 space-y-6">
                {/* Stats Bar */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-slate-100 dark:border-slate-700 grid grid-cols-3 gap-2 text-center divide-x divide-slate-100 dark:divide-slate-700 transition-colors">
                    <div>
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Duração</p>
                        <p className="text-lg font-bold text-primary">00:00</p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Volume</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">0 kg</p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Séries</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">0</p>
                    </div>
                </div>

                {/* Exercises List */}
                <div className="space-y-6">
                    {exercises.map((exercise, exIndex) => (
                        <div key={exercise.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
                            {/* Exercise Header */}
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center text-primary">
                                            <span className="material-symbols-rounded">fitness_center</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-base text-primary leading-tight">{exercise.name}</h3>
                                            <a href={exercise.videoUrl} className="text-xs text-slate-500 dark:text-slate-400 hover:text-primary flex items-center gap-1 mt-0.5">
                                                <span className="material-symbols-rounded text-[12px]">link</span> Ver vídeo
                                            </a>
                                        </div>
                                    </div>
                                    <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                        <span className="material-symbols-rounded">more_vert</span>
                                    </button>
                                </div>
                                {exercise.notes && (
                                    <div className="mt-2 bg-slate-50 dark:bg-slate-700/30 p-2 rounded-lg">
                                        <p className="text-xs italic text-slate-500 dark:text-slate-400">"{exercise.notes}"</p>
                                    </div>
                                )}
                            </div>

                            {/* Sets Table */}
                            <div className="w-full">
                                <div className="grid grid-cols-[30px_1fr_50px_50px_36px_36px] gap-2 px-2 py-2 bg-slate-50/50 dark:bg-slate-900/30 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center items-center">
                                    <div>#</div>
                                    <div className="text-left pl-2">Prev</div>
                                    <div>KG</div>
                                    <div>Reps</div>
                                    <div>RPE</div>
                                    <div><span className="material-symbols-rounded text-sm">check</span></div>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {exercise.sets.map((set, setIndex) => {
                                        const isWarmup = set.type === 'W';
                                        const isFailure = set.type === 'F';
                                        const rowBg = set.completed
                                            ? 'bg-slate-50 dark:bg-slate-800/80 opacity-60'
                                            : (isWarmup ? 'bg-amber-50/30 dark:bg-amber-900/5' : (isFailure ? 'bg-red-50/30 dark:bg-red-900/5' : ''));

                                        return (
                                            <div key={set.id} className={`grid grid-cols-[30px_1fr_50px_50px_36px_36px] gap-2 px-2 py-3 items-center text-center transition-all duration-300 ${rowBg}`}>
                                                <div className={`font-bold text-sm ${isWarmup ? 'text-warning' : (isFailure ? 'text-danger' : 'text-slate-700 dark:text-slate-300')}`}>
                                                    {set.type === '1' || set.type === '2' ? exIndex + 1 : set.type}
                                                </div>
                                                <div className="text-left pl-2">
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{set.prev}</div>
                                                </div>
                                                <div>
                                                    <input
                                                        type="number"
                                                        className="w-full h-8 text-center text-sm font-medium bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary p-0 text-slate-900 dark:text-white"
                                                        placeholder="-"
                                                        value={set.kg}
                                                        onChange={(e) => handleInputChange(exercise.id, set.id, 'kg', e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <input
                                                        type="text"
                                                        className="w-full h-8 text-center text-sm font-medium bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary p-0 text-slate-900 dark:text-white"
                                                        placeholder="-"
                                                        value={set.reps}
                                                        onChange={(e) => handleInputChange(exercise.id, set.id, 'reps', e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <button
                                                        onClick={() => openPseModal(set.id)}
                                                        className={`w-full h-8 rounded-lg flex items-center justify-center text-[10px] font-bold transition-colors ${set.rpe ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}
                                                    >
                                                        {set.rpe || '@'}
                                                    </button>
                                                </div>
                                                <div className="flex justify-center">
                                                    <button
                                                        onClick={() => toggleSetCompletion(exIndex, setIndex, set.rest)}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${set.completed ? 'bg-success text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                                                    >
                                                        <span className="material-symbols-rounded text-lg">check</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Rest Timer Toast */}
            {toastVisible && (
                <div className="fixed bottom-[90px] left-0 right-0 z-[60] flex justify-center px-4 animate-slide-up">
                    <div className="bg-slate-900/95 dark:bg-black/95 text-white backdrop-blur-md px-5 py-3 rounded-2xl shadow-2xl flex items-center justify-between w-full max-w-sm border border-white/10">
                        <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-primary/20 animate-pulse"></div>
                                <span className="material-symbols-rounded text-lg text-primary relative z-10">timer</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Descanso</span>
                                <span className="font-mono text-2xl font-bold leading-none tabular-nums tracking-tight">{formatTime(timeLeft)}</span>
                            </div>
                        </div>
                        <button
                            onClick={stopRestTimer}
                            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2 rounded-lg transition-colors border border-slate-700"
                        >
                            Pular
                        </button>
                    </div>
                </div>
            )}

            {/* PSE Modal */}
            {pseModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={closePseModal}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Percepção de Esforço</h3>
                            <button className="text-slate-400 hover:text-primary transition-colors" onClick={closePseModal}>
                                <span className="material-symbols-rounded">close</span>
                            </button>
                        </div>
                        <div className="p-2 space-y-1 max-h-[60vh] overflow-y-auto">
                            {[10, 9, 8, 7, 6].map(val => {
                                const colors: { [key: number]: string } = {
                                    10: 'bg-red-100 text-red-600',
                                    9: 'bg-orange-100 text-orange-600',
                                    8: 'bg-amber-100 text-amber-600',
                                    7: 'bg-blue-100 text-blue-600',
                                    6: 'bg-emerald-100 text-emerald-600'
                                };
                                const labels: { [key: number]: string } = {
                                    10: 'Esforço Máximo',
                                    9: 'Muito Intenso',
                                    8: 'Intenso',
                                    7: 'Vigoroso',
                                    6: 'Moderado'
                                };
                                return (
                                    <button key={val} className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors" onClick={() => selectPse(val)}>
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${colors[val]}`}>{val}</span>
                                        <div>
                                            <p className="font-bold text-sm text-slate-900 dark:text-white">{labels[val]}</p>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};

export default WorkoutExecution;
