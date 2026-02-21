import React, { useEffect, useState, useMemo } from 'react';
import MainLayout from '../../components/Layout/MainLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell, ReferenceLine } from 'recharts';

// --- Types ---
interface SetLogEntry {
    exercise_id: string;
    weight_kg: number;
    reps_completed: number;
    set_type: string;
    workout_log_id: string;
    finished_at: string; // from joined workout_logs
    exercise_name: string; // from joined exercises
}

interface ExerciseStats {
    exercise_id: string;
    name: string;
    sessionCount: number;
    totalSets: number;
}

interface PRRecord {
    reps: number;
    weight: number;
    date: string;
    isNew: boolean; // Was this PR set in the most recent session?
}

interface ProgressionPoint {
    date: string;
    dateLabel: string;
    maxWeight: number;
    isPR: boolean;
}

// --- Component ---
const Evolution: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [setLogs, setSetLogs] = useState<SetLogEntry[]>([]);
    const [totalWorkouts, setTotalWorkouts] = useState(0);
    const [selectedExercise, setSelectedExercise] = useState<ExerciseStats | null>(null);
    const [selectedReps, setSelectedReps] = useState<number | null>(null);

    // --- Fetch Data ---
    useEffect(() => {
        if (user) fetchEvolutionData();
    }, [user]);

    const fetchEvolutionData = async () => {
        try {
            setLoading(true);

            // Count total workouts
            const { count } = await supabase
                .from('workout_logs')
                .select('*', { count: 'exact', head: true })
                .eq('student_id', user!.id);

            setTotalWorkouts(count || 0);

            // Fetch all set_logs with exercise name and workout date
            const { data, error } = await supabase
                .from('set_logs')
                .select(`
                    exercise_id,
                    weight_kg,
                    reps_completed,
                    set_type,
                    workout_log_id,
                    workout_logs!inner(finished_at, student_id),
                    exercises!inner(name)
                `)
                .eq('workout_logs.student_id', user!.id)
                .order('workout_log_id');

            if (error) throw error;

            // Flatten the nested data
            const flatData: SetLogEntry[] = (data || []).map((row: any) => ({
                exercise_id: row.exercise_id,
                weight_kg: Number(row.weight_kg) || 0,
                reps_completed: Number(row.reps_completed) || 0,
                set_type: row.set_type,
                workout_log_id: row.workout_log_id,
                finished_at: row.workout_logs?.finished_at || '',
                exercise_name: row.exercises?.name || 'Desconhecido',
            }));

            setSetLogs(flatData);
        } catch (err: any) {
            console.error('Erro ao buscar dados de evolução:', err);
            toast.error('Erro ao carregar dados.');
        } finally {
            setLoading(false);
        }
    };

    // --- Computed: Exercise Stats (sorted by session count) ---
    const exerciseStats = useMemo<ExerciseStats[]>(() => {
        const map = new Map<string, { name: string; sessions: Set<string>; totalSets: number }>();

        setLogs.forEach(log => {
            if (!map.has(log.exercise_id)) {
                map.set(log.exercise_id, { name: log.exercise_name, sessions: new Set(), totalSets: 0 });
            }
            const entry = map.get(log.exercise_id)!;
            entry.sessions.add(log.workout_log_id);
            entry.totalSets++;
        });

        return Array.from(map.entries())
            .map(([id, data]) => ({
                exercise_id: id,
                name: data.name,
                sessionCount: data.sessions.size,
                totalSets: data.totalSets,
            }))
            .filter(e => e.sessionCount >= 4)
            .sort((a, b) => b.sessionCount - a.sessionCount);
    }, [setLogs]);

    // --- Computed: Total Volume ---
    const totalVolume = useMemo(() => {
        return setLogs.reduce((acc, log) => acc + (log.weight_kg * log.reps_completed), 0);
    }, [setLogs]);

    // --- Computed: Favorite Exercise ---
    const favoriteExercise = useMemo(() => {
        return exerciseStats.length > 0 ? exerciseStats[0].name : '—';
    }, [exerciseStats]);

    // --- Computed: Available Rep Ranges for Selected Exercise ---
    const availableReps = useMemo<number[]>(() => {
        if (!selectedExercise) return [];
        const repsSet = new Set<number>();
        setLogs
            .filter(l => l.exercise_id === selectedExercise.exercise_id && l.weight_kg > 0)
            .forEach(l => repsSet.add(l.reps_completed));
        return Array.from(repsSet).sort((a, b) => a - b);
    }, [setLogs, selectedExercise]);

    // Auto-select most common rep range when exercise changes
    useEffect(() => {
        if (availableReps.length > 0 && selectedExercise) {
            // Find most common rep range
            const repCounts = new Map<number, number>();
            setLogs
                .filter(l => l.exercise_id === selectedExercise.exercise_id && l.weight_kg > 0)
                .forEach(l => repCounts.set(l.reps_completed, (repCounts.get(l.reps_completed) || 0) + 1));

            let maxCount = 0;
            let mostCommon = availableReps[0];
            repCounts.forEach((count, reps) => {
                if (count > maxCount) {
                    maxCount = count;
                    mostCommon = reps;
                }
            });
            setSelectedReps(mostCommon);
        } else {
            setSelectedReps(null);
        }
    }, [availableReps, selectedExercise]);

    // --- Computed: Progression Data for Chart ---
    const progressionData = useMemo<ProgressionPoint[]>(() => {
        if (!selectedExercise || selectedReps === null) return [];

        // Get all logs for this exercise + rep range, grouped by session date
        const sessionMap = new Map<string, { date: string; maxWeight: number }>();

        setLogs
            .filter(l =>
                l.exercise_id === selectedExercise.exercise_id &&
                l.reps_completed === selectedReps &&
                l.weight_kg > 0
            )
            .forEach(l => {
                const dateKey = l.finished_at.split('T')[0]; // YYYY-MM-DD
                const existing = sessionMap.get(dateKey);
                if (!existing || l.weight_kg > existing.maxWeight) {
                    sessionMap.set(dateKey, { date: l.finished_at, maxWeight: l.weight_kg });
                }
            });

        // Sort by date and track PRs
        const sorted = Array.from(sessionMap.values()).sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        let currentPR = 0;
        return sorted.map(entry => {
            const isPR = entry.maxWeight > currentPR;
            if (isPR) currentPR = entry.maxWeight;
            return {
                date: entry.date,
                dateLabel: new Date(entry.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                maxWeight: entry.maxWeight,
                isPR,
            };
        });
    }, [setLogs, selectedExercise, selectedReps]);

    // --- Computed: All PRs for Selected Exercise ---
    const personalRecords = useMemo<PRRecord[]>(() => {
        if (!selectedExercise) return [];

        const prMap = new Map<number, { weight: number; date: string }>();

        // Sort all logs by date first
        const exerciseLogs = setLogs
            .filter(l => l.exercise_id === selectedExercise.exercise_id && l.weight_kg > 0)
            .sort((a, b) => new Date(a.finished_at).getTime() - new Date(b.finished_at).getTime());

        exerciseLogs.forEach(log => {
            const current = prMap.get(log.reps_completed);
            if (!current || log.weight_kg > current.weight) {
                prMap.set(log.reps_completed, { weight: log.weight_kg, date: log.finished_at });
            }
        });

        // Determine which PRs are "new" (set in the last session of this exercise)
        const lastSessionDate = exerciseLogs.length > 0
            ? exerciseLogs[exerciseLogs.length - 1].finished_at.split('T')[0]
            : '';

        return Array.from(prMap.entries())
            .map(([reps, data]) => ({
                reps,
                weight: data.weight,
                date: data.date,
                isNew: data.date.split('T')[0] === lastSessionDate,
            }))
            .sort((a, b) => a.reps - b.reps);
    }, [setLogs, selectedExercise]);

    // --- Recently broken PRs (from all exercises, last 7 days) ---
    const recentPRs = useMemo(() => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const allPRs: { exercise: string; reps: number; weight: number; date: string }[] = [];

        // For each exercise, compute PRs and check if the PR date is within last 7 days
        const exerciseGroups = new Map<string, { name: string; logs: SetLogEntry[] }>();
        setLogs.filter(l => l.weight_kg > 0).forEach(l => {
            if (!exerciseGroups.has(l.exercise_id)) {
                exerciseGroups.set(l.exercise_id, { name: l.exercise_name, logs: [] });
            }
            exerciseGroups.get(l.exercise_id)!.logs.push(l);
        });

        exerciseGroups.forEach(({ name, logs }) => {
            // Sort by date
            logs.sort((a, b) => new Date(a.finished_at).getTime() - new Date(b.finished_at).getTime());

            // Track PR per rep count
            const prMap = new Map<number, { weight: number; date: string; prevWeight: number }>();
            logs.forEach(log => {
                const current = prMap.get(log.reps_completed);
                if (!current) {
                    prMap.set(log.reps_completed, { weight: log.weight_kg, date: log.finished_at, prevWeight: 0 });
                } else if (log.weight_kg > current.weight) {
                    prMap.set(log.reps_completed, { weight: log.weight_kg, date: log.finished_at, prevWeight: current.weight });
                }
            });

            prMap.forEach((data, reps) => {
                if (new Date(data.date) >= sevenDaysAgo && data.prevWeight > 0) {
                    allPRs.push({ exercise: name, reps, weight: data.weight, date: data.date });
                }
            });
        });

        return allPRs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    }, [setLogs]);

    // --- Custom Tooltip ---
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload as ProgressionPoint;
            return (
                <div className="bg-white dark:bg-slate-800 px-3 py-2 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 text-sm">
                    <p className="text-slate-500 text-xs">{new Date(data.date).toLocaleDateString('pt-BR')}</p>
                    <p className="font-bold text-slate-900 dark:text-white">
                        {data.maxWeight}kg × {selectedReps} reps
                    </p>
                    {data.isPR && (
                        <p className="text-amber-500 font-bold text-xs flex items-center gap-1 mt-0.5">
                            <span>🏆</span> Recorde Pessoal!
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    // --- Render ---
    return (
        <MainLayout>
            {/* Header */}
            <header className="w-full px-5 py-4 flex items-center gap-3 sticky top-0 bg-white dark:bg-slate-900 z-30 border-b border-slate-100 dark:border-slate-800">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <span className="material-symbols-rounded text-slate-500">arrow_back</span>
                </button>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display">Evolução</h1>
                    <p className="text-xs text-slate-500">Acompanhe seus recordes pessoais</p>
                </div>
            </header>

            <main className="w-full px-4 sm:px-5 pt-6 max-w-2xl mx-auto pb-24 space-y-6">
                {loading ? (
                    <div className="space-y-4 animate-pulse">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                            <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                        </div>
                        <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                    </div>
                ) : (
                    <>
                        {/* ══════ Section: Summary Cards ══════ */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-800 p-4 rounded-2xl border border-blue-100/50 dark:border-blue-700/30">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-rounded text-blue-500 text-lg">fitness_center</span>
                                    <span className="text-xs font-bold text-slate-400 uppercase">Treinos</span>
                                </div>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{totalWorkouts}</p>
                            </div>

                            <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-700/30">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-rounded text-emerald-500 text-lg">monitoring</span>
                                    <span className="text-xs font-bold text-slate-400 uppercase">Volume Total</span>
                                </div>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">
                                    {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}t` : `${totalVolume.toFixed(0)}kg`}
                                </p>
                            </div>

                            <div className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-slate-800 p-4 rounded-2xl border border-purple-100/50 dark:border-purple-700/30">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-rounded text-purple-500 text-lg">analytics</span>
                                    <span className="text-xs font-bold text-slate-400 uppercase">Monitorados</span>
                                </div>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{exerciseStats.length}</p>
                                <p className="text-[10px] text-slate-400">exercícios ≥4 sessões</p>
                            </div>

                            <div className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-800 p-4 rounded-2xl border border-amber-100/50 dark:border-amber-700/30">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-rounded text-amber-500 text-lg">favorite</span>
                                    <span className="text-xs font-bold text-slate-400 uppercase">Favorito</span>
                                </div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{favoriteExercise}</p>
                            </div>
                        </div>

                        {/* ══════ Section: Recent PRs / Achievements ══════ */}
                        {recentPRs.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="text-xl">🏆</span> Recordes Recentes
                                </h3>
                                <div className="space-y-2">
                                    {recentPRs.map((pr, i) => (
                                        <div
                                            key={`${pr.exercise}-${pr.reps}-${i}`}
                                            className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-yellow-50/50 dark:from-amber-900/20 dark:to-yellow-900/10 rounded-xl border border-amber-200/50 dark:border-amber-700/30 animate-fade-in"
                                            style={{ animationDelay: `${i * 100}ms` }}
                                        >
                                            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                                                <span className="text-lg">🏆</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{pr.exercise}</p>
                                                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                                    {pr.weight}kg × {pr.reps} reps
                                                </p>
                                            </div>
                                            <span className="text-[10px] text-slate-400 flex-shrink-0">
                                                {new Date(pr.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ══════ Section: Most Practiced Exercises ══════ */}
                        <div className="space-y-3">
                            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white px-1">
                                Exercícios Monitorados
                            </h3>

                            {exerciseStats.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                    <span className="material-symbols-rounded text-4xl text-slate-300 dark:text-slate-600 mb-2 block">query_stats</span>
                                    <p className="text-sm text-slate-500 font-medium">Ainda sem dados suficientes</p>
                                    <p className="text-xs text-slate-400 mt-1">Complete ao menos 4 sessões com um exercício</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {exerciseStats.map((ex, i) => (
                                        <button
                                            key={ex.exercise_id}
                                            onClick={() => setSelectedExercise(
                                                selectedExercise?.exercise_id === ex.exercise_id ? null : ex
                                            )}
                                            className={`w-full text-left p-4 rounded-2xl border transition-all active:scale-[0.98] ${selectedExercise?.exercise_id === ex.exercise_id
                                                ? 'bg-primary/5 border-primary/30 shadow-sm shadow-primary/10'
                                                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-primary/20'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${selectedExercise?.exercise_id === ex.exercise_id
                                                        ? 'bg-primary text-white'
                                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                                        }`}>
                                                        {i + 1}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{ex.name}</p>
                                                        <p className="text-xs text-slate-400">{ex.sessionCount} sessões · {ex.totalSets} sets</p>
                                                    </div>
                                                </div>
                                                <span className={`material-symbols-rounded transition-transform ${selectedExercise?.exercise_id === ex.exercise_id ? 'rotate-180 text-primary' : 'text-slate-300'}`}>
                                                    expand_more
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ══════ Section: Progression Chart (Expanded) ══════ */}
                        {selectedExercise && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                                    <div className="p-4 border-b border-slate-50 dark:border-slate-700/50">
                                        <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <span className="material-symbols-rounded text-primary text-lg">show_chart</span>
                                            Progressão: {selectedExercise.name}
                                        </h4>
                                        <p className="text-xs text-slate-400 mt-0.5">Carga máxima por sessão para a faixa de repetições selecionada</p>
                                    </div>

                                    {/* Rep Range Tabs */}
                                    <div className="px-4 pt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                        {availableReps.map(r => (
                                            <button
                                                key={r}
                                                onClick={() => setSelectedReps(r)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedReps === r
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'
                                                    }`}
                                            >
                                                {r} reps
                                            </button>
                                        ))}
                                    </div>

                                    {/* Chart */}
                                    <div className="p-4">
                                        {progressionData.length < 2 ? (
                                            <div className="text-center py-8 text-slate-400">
                                                <span className="material-symbols-rounded text-3xl mb-2 block">timeline</span>
                                                <p className="text-sm">Dados insuficientes para esta faixa de repetições</p>
                                                <p className="text-xs mt-1">Precisa de ao menos 2 sessões</p>
                                            </div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height={220}>
                                                <LineChart data={progressionData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-100, #f1f5f9)" />
                                                    <XAxis
                                                        dataKey="dateLabel"
                                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                                        tickLine={false}
                                                        axisLine={false}
                                                    />
                                                    <YAxis
                                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                                        tickLine={false}
                                                        axisLine={false}
                                                        unit="kg"
                                                        width={45}
                                                    />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="maxWeight"
                                                        stroke="#6366f1"
                                                        strokeWidth={2.5}
                                                        dot={(props: any) => {
                                                            const { cx, cy, payload } = props;
                                                            if (payload.isPR) {
                                                                return (
                                                                    <g key={`pr-${cx}-${cy}`}>
                                                                        <circle cx={cx} cy={cy} r={6} fill="#f59e0b" stroke="#fff" strokeWidth={2} />
                                                                        <text x={cx} y={cy - 12} textAnchor="middle" fontSize={10} fill="#f59e0b" fontWeight="bold">PR</text>
                                                                    </g>
                                                                );
                                                            }
                                                            return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3.5} fill="#6366f1" stroke="#fff" strokeWidth={1.5} />;
                                                        }}
                                                        activeDot={{ r: 6, strokeWidth: 2 }}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>

                                    {/* Trend Indicator */}
                                    {progressionData.length >= 2 && (
                                        <div className="px-4 pb-4">
                                            {(() => {
                                                const last = progressionData[progressionData.length - 1].maxWeight;
                                                const prev = progressionData[progressionData.length - 2].maxWeight;
                                                const diff = last - prev;
                                                if (diff > 0) return (
                                                    <div className="flex items-center gap-2 text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-xl text-sm font-medium">
                                                        <span className="material-symbols-rounded text-lg">trending_up</span>
                                                        +{diff}kg vs sessão anterior
                                                    </div>
                                                );
                                                if (diff < 0) return (
                                                    <div className="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl text-sm font-medium">
                                                        <span className="material-symbols-rounded text-lg">trending_down</span>
                                                        {diff}kg vs sessão anterior
                                                    </div>
                                                );
                                                return (
                                                    <div className="flex items-center gap-2 text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-xl text-sm font-medium">
                                                        <span className="material-symbols-rounded text-lg">trending_flat</span>
                                                        Manteve a carga
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>

                                {/* PR Table for Selected Exercise */}
                                {personalRecords.length > 0 && (
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                                        <div className="p-4 border-b border-slate-50 dark:border-slate-700/50">
                                            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                                <span className="text-base">🏆</span> Recordes Pessoais — {selectedExercise.name}
                                            </h4>
                                        </div>
                                        <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                            {personalRecords.map((pr) => (
                                                <div
                                                    key={pr.reps}
                                                    className={`flex items-center justify-between px-4 py-3 ${pr.isNew ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {pr.isNew && <span className="text-sm">🏆</span>}
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                                {pr.weight}kg × {pr.reps} reps
                                                            </p>
                                                            <p className="text-[10px] text-slate-400">
                                                                {new Date(pr.date).toLocaleDateString('pt-BR')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {pr.isNew && (
                                                        <span className="text-[10px] font-bold text-amber-500 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                                                            NOVO
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </main>
        </MainLayout>
    );
};

export default Evolution;
