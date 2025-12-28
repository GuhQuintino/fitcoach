import React, { useEffect, useState } from 'react';
import MainLayout from '../../components/Layout/MainLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const History: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [expandedLog, setExpandedLog] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            fetchLogs();
        }
    }, [user]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('workout_logs')
                .select(`
                    *,
                    workout:workouts (name),
                    set_logs (
                        *,
                        exercise:exercises (name)
                    )
                `)
                .eq('student_id', user!.id)
                .order('started_at', { ascending: false });

            if (error) throw error;
            setLogs(data || []);

        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        return `${m} min`;
    };

    // Calendar logic
    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const currentYear = selectedDate.getFullYear();
    const currentMonth = selectedDate.getMonth();
    const totalDays = daysInMonth(currentYear, currentMonth);
    const startOffset = firstDayOfMonth(currentYear, currentMonth);

    const hasWorkout = (day: number) => {
        return logs.some(log => {
            const d = new Date(log.started_at);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() === day;
        });
    };

    const getWeeklyVolumeData = () => {
        if (!logs.length) return [];
        const weeks: { [key: string]: number } = {};

        const getWeekKey = (date: Date) => {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() + 4 - (d.getDay() || 7));
            const yearStart = new Date(d.getFullYear(), 0, 1);
            const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
            return `${d.getFullYear()}-W${weekNo}`;
        };

        // Last 5 weeks
        for (let i = 4; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - (i * 7));
            const weekKey = getWeekKey(d);
            weeks[weekKey] = 0;
        }

        logs.forEach(log => {
            const weekKey = getWeekKey(new Date(log.started_at));
            if (weeks[weekKey] !== undefined) {
                let workoutVolume = 0;
                log.set_logs?.forEach((set: any) => {
                    const w = parseFloat(set.weight_kg || set.weight) || 0;
                    const r = parseInt(set.reps_completed || set.reps) || 0;
                    workoutVolume += (w * r);
                });
                weeks[weekKey] += workoutVolume;
            }
        });

        return Object.entries(weeks).map(([key, value], index) => ({
            name: index === 4 ? 'Atual' : `Sem ${index + 1}`,
            volume: value
        }));
    };

    const weeklyData = getWeeklyVolumeData();
    const latestVolume = weeklyData[weeklyData.length - 1]?.volume || 0;
    const prevVolume = weeklyData[weeklyData.length - 2]?.volume || 0;
    const diffPercent = prevVolume > 0 ? ((latestVolume - prevVolume) / prevVolume * 100).toFixed(1) : null;

    return (
        <MainLayout>
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-40 left-0 w-56 h-56 bg-sky-400/10 rounded-full blur-3xl"></div>
            </div>

            <header className="relative sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100/50 dark:border-slate-800/50 shadow-sm px-6 py-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display">Histórico</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Seus treinos realizados</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-sky-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-200/50 dark:border-emerald-700/50">
                    {logs.length}
                </div>
            </header>

            <main className="relative px-5 py-6 space-y-6 pb-24">
                {/* Weekly Volume Chart */}
                <section className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-soft border border-slate-100 dark:border-slate-700 animate-slide-up">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Volume Total semanal</p>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Evolução 30 dias</h3>
                        </div>
                        {diffPercent && (
                            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black ${parseFloat(diffPercent) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                <span className="material-symbols-rounded text-sm">{parseFloat(diffPercent) >= 0 ? 'trending_up' : 'trending_down'}</span>
                                {parseFloat(diffPercent) >= 0 ? '+' : ''}{diffPercent}%
                            </div>
                        )}
                    </div>

                    <div className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                                    dy={10}
                                />
                                <YAxis hide domain={[0, 'auto']} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                                    formatter={(val: number) => [`${Math.round(val).toLocaleString()} kg`, 'Volume']}
                                />
                                <Bar dataKey="volume" radius={[6, 6, 6, 6]} barSize={40}>
                                    {weeklyData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={index === weeklyData.length - 1 ? '#3b82f6' : '#bfdbfe'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* Calendar Card */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-soft border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-6 px-1">
                        <h2 className="font-bold text-slate-800 dark:text-white capitalize">
                            {selectedDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                        </h2>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelectedDate(new Date(currentYear, currentMonth - 1, 1))}
                                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-sky-500 transition-colors"
                            >
                                <span className="material-symbols-rounded">chevron_left</span>
                            </button>
                            <button
                                onClick={() => setSelectedDate(new Date(currentYear, currentMonth + 1, 1))}
                                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-sky-500 transition-colors"
                            >
                                <span className="material-symbols-rounded">chevron_right</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                            <span key={i} className="text-[10px] font-bold text-slate-400">{d}</span>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: startOffset }).map((_, i) => (
                            <div key={`empty-${i}`} className="h-9"></div>
                        ))}
                        {Array.from({ length: totalDays }).map((_, i) => {
                            const day = i + 1;
                            const active = hasWorkout(day);
                            const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();

                            return (
                                <div
                                    key={day}
                                    className={`
                                        h-9 flex items-center justify-center rounded-xl text-sm font-bold relative
                                        ${isToday ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30' : 'text-slate-600 dark:text-slate-400'}
                                        ${active && !isToday ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400' : ''}
                                    `}
                                >
                                    {day}
                                    {active && (
                                        <div className={`absolute bottom-1 w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-sky-500'}`}></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                        <span className="material-symbols-rounded text-4xl text-slate-300 mb-2">history</span>
                        <p className="text-slate-500">Nenhum treino registrado.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-900 dark:text-white px-1">Treinos Recentes</h3>
                        {logs.map(log => (
                            <div key={log.id} className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-soft border border-slate-100 dark:border-slate-700 transition-all">
                                <button
                                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                    className="w-full p-5 flex items-center gap-4 text-left"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center text-slate-400">
                                        <span className="text-[10px] font-black uppercase leading-none">{new Date(log.started_at).toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                                        <span className="text-lg font-black leading-tight">{new Date(log.started_at).getDate()}</span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-900 dark:text-white truncate">{log.workout?.name || 'Treino s/ nome'}</h3>
                                        <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            <span className="flex items-center gap-1">
                                                <span className="material-symbols-rounded text-[14px]">schedule</span>
                                                {formatDuration(log.duration_seconds || 0)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className="material-symbols-rounded text-[14px]">fitness_center</span>
                                                {log.effort_rating || 0}/10 Esforço
                                            </span>
                                        </div>
                                    </div>

                                    <div className={`text-slate-300 transition-transform duration-300 ${expandedLog === log.id ? 'rotate-90' : ''}`}>
                                        <span className="material-symbols-rounded">chevron_right</span>
                                    </div>
                                </button>

                                {expandedLog === log.id && (
                                    <div className="px-5 pb-6 pt-2 space-y-4 border-t border-slate-50 dark:border-slate-700/50 animate-fade-in">
                                        {/* Feedback Note */}
                                        {log.feedback_notes && (
                                            <div className="bg-sky-50 dark:bg-sky-900/10 p-4 rounded-2xl border border-sky-100 dark:border-sky-900/20">
                                                <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest block mb-1">Seu Feedback</span>
                                                <p className="text-sm text-slate-600 dark:text-slate-300 italic">"{log.feedback_notes}"</p>
                                            </div>
                                        )}

                                        {/* Exercises Breakdown */}
                                        <div className="space-y-4">
                                            {(() => {
                                                const grouped = log.set_logs.reduce((acc: any, set: any) => {
                                                    const key = set.exercise.name;
                                                    if (!acc[key]) acc[key] = [];
                                                    acc[key].push(set);
                                                    return acc;
                                                }, {});

                                                return Object.entries(grouped).map(([exerciseName, sets]: [string, any]) => (
                                                    <div key={exerciseName}>
                                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">{exerciseName}</h4>
                                                        <div className="space-y-1">
                                                            {sets.map((set: any, idx: number) => (
                                                                <div key={set.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/30 text-sm">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="w-5 h-5 rounded-md bg-white dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400">{idx + 1}</span>
                                                                        <span className="font-bold text-slate-700 dark:text-slate-200">{set.weight_kg}kg <span className="text-slate-400 font-normal">x {set.reps_completed}</span></span>
                                                                    </div>
                                                                    {set.rpe_actual && (
                                                                        <span className="text-[10px] font-black text-slate-400">@{set.rpe_actual}</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </MainLayout>
    );
};

export default History;