import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import ToggleSwitch from '../../components/shared/ToggleSwitch';
import {
    isPushSupported,
    isIOS,
    isStandalonePWA,
    getNotificationPermission,
    subscribeUserToPush,
    unsubscribeUserFromPush
} from '../../utils/pushNotificationService';
import {
    inferTrainingHabits,
    WorkoutLogSample
} from '../../utils/workoutHabitAnalyzer';
import {
    getRecentNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead
} from '../../utils/smartNotificationDispatcher';
import {
    NotificationLog,
    NotificationPreferences,
    HabitInferenceResult
} from '../../types/notifications';

const DAY_NAMES = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado'
];

const NotificationsSettings: React.FC = () => {
    const navigate = useNavigate();
    const { user, role, preferences, updatePreferences } = useAuth();

    // Preferências normalizadas
    const notifPrefs: NotificationPreferences = useMemo(() => {
        const raw = preferences?.notifications || {};
        return {
            push: raw.push ?? true,
            email: raw.email ?? false,
            reminders: raw.reminders ?? true,
            evolution_photos: raw.evolution_photos ?? true,
            plan_expiration: raw.plan_expiration ?? true,
            system_updates: raw.system_updates ?? true,
            quiet_hours_start: raw.quiet_hours_start || '21:30',
            quiet_hours_end: raw.quiet_hours_end || '07:30',
            preferred_training_time: raw.preferred_training_time || null
        };
    }, [preferences]);

    // Estados locais
    const [pushLoading, setPushLoading] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');
    const [workoutLogs, setWorkoutLogs] = useState<WorkoutLogSample[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [customTimeInput, setCustomTimeInput] = useState<string>(notifPrefs.preferred_training_time || '18:30');
    const [isEditingCustomTime, setIsEditingCustomTime] = useState<boolean>(Boolean(notifPrefs.preferred_training_time));
    const [recentNotifs, setRecentNotifs] = useState<NotificationLog[]>([]);
    const [notifsLoading, setNotifsLoading] = useState(false);

    // Estados locais para Horário de Silêncio com persistência em onBlur (evita flood no Supabase)
    const [quietStartInput, setQuietStartInput] = useState<string>(notifPrefs.quiet_hours_start);
    const [quietEndInput, setQuietEndInput] = useState<string>(notifPrefs.quiet_hours_end);

    // Sincronizar inputs quando as preferências mudarem externamente
    useEffect(() => {
        setQuietStartInput(notifPrefs.quiet_hours_start);
        setQuietEndInput(notifPrefs.quiet_hours_end);
    }, [notifPrefs.quiet_hours_start, notifPrefs.quiet_hours_end]);

    // Carregar estado de permissões nativas
    useEffect(() => {
        setPermissionStatus(getNotificationPermission());
    }, []);

    // Sincronizar input de horário manual quando a preferência mudar
    useEffect(() => {
        if (notifPrefs.preferred_training_time) {
            setCustomTimeInput(notifPrefs.preferred_training_time);
            setIsEditingCustomTime(true);
        }
    }, [notifPrefs.preferred_training_time]);

    // Buscar histórico de treinos do aluno para o card de hábito inteligente
    useEffect(() => {
        if (!user?.id || role !== 'student') return;

        let isMounted = true;
        const fetchLogs = async () => {
            setLogsLoading(true);
            try {
                const past28Days = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
                const { data, error } = await supabase
                    .from('workout_logs')
                    .select('started_at')
                    .eq('student_id', user.id)
                    .gte('started_at', past28Days)
                    .order('started_at', { ascending: false });

                if (!error && data && isMounted) {
                    setWorkoutLogs(data as WorkoutLogSample[]);
                }
            } catch (err) {
                console.warn('[Notifications] Falha ao carregar logs:', err);
            } finally {
                if (isMounted) setLogsLoading(false);
            }
        };

        fetchLogs();
        return () => { isMounted = false; };
    }, [user?.id, role]);

    // Buscar histórico de notificações do usuário
    const loadRecentNotifications = useCallback(async () => {
        if (!user?.id) return;
        setNotifsLoading(true);
        try {
            const list = await getRecentNotifications(user.id, 15);
            setRecentNotifs(list);
        } catch (err) {
            console.warn('[Notifications] Falha ao carregar alertas:', err);
        } finally {
            setNotifsLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadRecentNotifications();
    }, [loadRecentNotifications]);

    // Cálculo do Padrão de Treino Inferido
    const habitResult: HabitInferenceResult = useMemo(() => {
        return inferTrainingHabits(workoutLogs, notifPrefs.preferred_training_time);
    }, [workoutLogs, notifPrefs.preferred_training_time]);

    // Toggle Principal de Notificações Push
    const handleTogglePush = async () => {
        if (!user?.id) return;
        const newPushState = !notifPrefs.push;
        setPushLoading(true);

        try {
            if (newPushState) {
                if (!isPushSupported()) {
                    if (isIOS() && !isStandalonePWA()) {
                        toast.error(
                            'No iPhone, adicione o Fitcoach à Tela de Início (Compartilhar > Adicionar à Tela de Início) para ativar notificações.',
                            { duration: 6000 }
                        );
                    } else {
                        toast.error('Notificações push não são suportadas neste navegador.');
                    }
                    setPushLoading(false);
                    return;
                }

                const result = await subscribeUserToPush(user.id);
                setPermissionStatus(getNotificationPermission());

                if (!result.success) {
                    toast.error(result.error || 'Permissão negada ou erro ao registrar push.');
                    setPushLoading(false);
                    return;
                }

                await updatePreferences({
                    notifications: {
                        ...notifPrefs,
                        push: true
                    }
                });
                toast.success('Notificações push ativadas com sucesso!');
            } else {
                await unsubscribeUserFromPush(user.id);
                await updatePreferences({
                    notifications: {
                        ...notifPrefs,
                        push: false
                    }
                });
                toast.success('Notificações desativadas.');
            }
        } catch (err: any) {
            console.error('[Notifications] Erro ao alternar push:', err);
            toast.error('Erro ao atualizar configurações de notificação.');
        } finally {
            setPushLoading(false);
        }
    };

    // Toggle de tópicos individuais
    const handleToggleTopic = async (key: keyof NotificationPreferences) => {
        const updated = {
            ...notifPrefs,
            [key]: !notifPrefs[key]
        };
        await updatePreferences({ notifications: updated });
        toast.success('Preferência salva.');
    };

    // Persistência em onBlur do Horário de Silêncio com feedback visual
    const handleQuietHoursBlur = async (field: 'quiet_hours_start' | 'quiet_hours_end', value: string) => {
        if (value === notifPrefs[field]) return;
        const updated = {
            ...notifPrefs,
            [field]: value
        };
        await updatePreferences({ notifications: updated });
        toast.success('Horário de silêncio atualizado.');
    };

    // Salvar ou remover horário manual
    const handleSaveManualTime = async () => {
        if (!/^\d{2}:\d{2}$/.test(customTimeInput)) {
            toast.error('Formato de horário inválido.');
            return;
        }

        const updated = {
            ...notifPrefs,
            preferred_training_time: customTimeInput
        };
        await updatePreferences({ notifications: updated });
        setIsEditingCustomTime(true);
        toast.success(`Horário fixado para ${customTimeInput}!`);
    };

    const handleResetToAutomatic = async () => {
        const updated = {
            ...notifPrefs,
            preferred_training_time: null
        };
        await updatePreferences({ notifications: updated });
        setIsEditingCustomTime(false);
        toast.success('Inferência automática restaurada.');
    };

    // Enviar notificação de teste local via Service Worker
    const handleSendTestNotification = async () => {
        try {
            if ('serviceWorker' in navigator) {
                const reg = await navigator.serviceWorker.ready;
                await reg.showNotification('Fitcoach Pro', {
                    body: 'Notificações ativas e funcionando perfeitamente no seu dispositivo!',
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                    tag: 'test-notification'
                });
                toast.success('Notificação de teste disparada!');
            } else {
                toast.error('Service Worker não disponível no momento.');
            }
        } catch (err) {
            console.error('[Notifications] Erro no teste:', err);
            toast.error('Falha ao disparar notificação de teste.');
        }
    };

    // Marcar todas como lidas
    const handleMarkAllAsRead = async () => {
        if (!user?.id) return;
        const success = await markAllNotificationsAsRead(user.id);
        if (success) {
            setRecentNotifs(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
            toast.success('Todas as notificações foram marcadas como lidas.');
        }
    };

    // Clicar em notificação individual
    const handleNotificationClick = async (notif: NotificationLog) => {
        if (!notif.read_at) {
            await markNotificationAsRead(notif.id);
            setRecentNotifs(prev =>
                prev.map(n => n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n)
            );
        }
        if (notif.action_url) {
            navigate(notif.action_url);
        }
    };

    // Tópicos visíveis de acordo com a função
    const studentTopics = [
        {
            key: 'reminders' as const,
            label: 'Lembretes de Treino',
            desc: 'Lembretes inteligentes no seu horário habitual nos dias que você costuma treinar.'
        },
        {
            key: 'evolution_photos' as const,
            label: 'Fotos de Evolução',
            desc: 'Lembrete gentil para registrar fotos de progresso e acompanhar sua evolução.'
        },
        {
            key: 'plan_expiration' as const,
            label: 'Vencimento de Plano',
            desc: 'Aviso prévio para renovar sua consultoria sem interrupções nos seus treinos.'
        }
    ];

    const coachTopics = [
        {
            key: 'evolution_photos' as const,
            label: 'Novos Feedbacks de Alunos',
            desc: 'Alertas quando alunos registrarem avaliações ou comentários em exercícios.'
        },
        {
            key: 'plan_expiration' as const,
            label: 'Alunos com Plano Expirando',
            desc: 'Avisos quando alunos precisarem de renovação de consultoria.'
        },
        {
            key: 'system_updates' as const,
            label: 'Atualizações do Sistema',
            desc: 'Novas funcionalidades e melhorias na plataforma Fitcoach.'
        }
    ];

    const activeTopics = role === 'coach' ? coachTopics : studentTopics;

    // Formatação dos dias habituais para exibição
    const habitualDaysText = useMemo(() => {
        if (!habitResult.habitualDays || habitResult.habitualDays.length === 0) {
            return 'Segunda, Quarta e Sexta';
        }
        const names = habitResult.habitualDays.map(d => DAY_NAMES[d].replace('-feira', ''));
        if (names.length === 1) return names[0];
        if (names.length === 2) return `${names[0]} e ${names[1]}`;
        return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
    }, [habitResult.habitualDays]);

    const isIosNonStandalone = isIOS() && !isStandalonePWA();

    return (
        <div className="bg-slate-50 dark:bg-slate-900 min-h-screen pb-24 transition-colors">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 p-6 pt-12 border-b border-slate-100 dark:border-slate-700 flex items-center gap-4 sticky top-0 z-30 shadow-soft">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    aria-label="Voltar à tela anterior"
                    className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center bg-slate-50 dark:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800"
                >
                    <span className="material-symbols-rounded" aria-hidden="true">arrow_back_ios_new</span>
                </button>
                <div className="flex flex-col">
                    <h1 className="font-display text-xl font-black text-slate-900 dark:text-white">Notificações</h1>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Centro de Alertas e Hábitos</p>
                </div>
            </header>

            <div className="p-6 space-y-8 max-w-2xl mx-auto">
                {/* Alerta Educativo para iOS Safari fora de Standalone */}
                {isIosNonStandalone && (
                    <section
                        aria-label="Instruções para iPhone"
                        className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 rounded-3xl p-5 flex items-start gap-4 shadow-soft"
                    >
                        <div className="w-10 h-10 min-w-[40px] rounded-2xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                            <span className="material-symbols-rounded text-xl" aria-hidden="true">ios_share</span>
                        </div>
                        <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                            <strong className="block font-bold text-slate-900 dark:text-white mb-1">
                                Ativar Notificações no iPhone
                            </strong>
                            No iOS Safari, a Apple exige que o app esteja instalado. Toque no botão de compartilhar do Safari e selecione <strong>"Adicionar à Tela de Início"</strong>.
                        </div>
                    </section>
                )}

                {/* Master Push Toggle */}
                <section className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-soft border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0">
                                <span className="material-symbols-rounded text-2xl" aria-hidden="true">
                                    {notifPrefs.push ? 'notifications_active' : 'notifications_off'}
                                </span>
                            </div>
                            <div>
                                <h2 className="font-bold text-base text-slate-900 dark:text-white">Push Notifications</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {permissionStatus === 'denied'
                                        ? 'Permissão bloqueada no navegador'
                                        : 'Alertas no celular mesmo com o app fechado'}
                                </p>
                            </div>
                        </div>

                        <ToggleSwitch
                            id="push-main-toggle"
                            checked={notifPrefs.push}
                            disabled={pushLoading}
                            onChange={handleTogglePush}
                            label="Ativar notificações push no celular"
                            size="md"
                        />
                    </div>

                    {/* Botão de Teste de Notificação Local (quando push estiver ativo e concedido) */}
                    {notifPrefs.push && permissionStatus === 'granted' && (
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-3 flex-wrap">
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Validar alertas neste aparelho</p>
                            <button
                                type="button"
                                onClick={handleSendTestNotification}
                                aria-label="Enviar notificação de teste para este aparelho"
                                className="min-h-[44px] px-3.5 py-1.5 bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                <span className="material-symbols-rounded text-sm" aria-hidden="true">send</span>
                                <span>Testar Alerta</span>
                            </button>
                        </div>
                    )}
                </section>

                {/* Card de Hábito Inteligente de Treino (Exclusivo para Aluno) */}
                {role === 'student' && (
                    <section
                        aria-label="Padrão de treino inteligente"
                        className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 text-white p-6 rounded-3xl shadow-elevated border border-slate-700/50 space-y-5"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary-light flex items-center justify-center">
                                    <span className="material-symbols-rounded text-lg" aria-hidden="true">psychology</span>
                                </div>
                                <h3 className="font-bold text-sm tracking-wide">Padrão de Treino Aprendido</h3>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/20 text-primary-light border border-primary/30">
                                {habitResult.isCustomOverride
                                    ? 'Horário Manual'
                                    : habitResult.confidence === 'high'
                                    ? 'Alta Precisão'
                                    : habitResult.confidence === 'medium'
                                    ? 'Em Aprendizado'
                                    : 'Padrão Inicial'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                            <div>
                                <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Horário Usual</p>
                                <p className="text-2xl font-black text-white mt-1">
                                    {habitResult.medianTime}
                                </p>
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Dias Habituais</p>
                                <p className="text-xs font-semibold text-slate-200 mt-1 line-clamp-2">
                                    {logsLoading ? 'Analisando histórico...' : habitualDaysText}
                                </p>
                            </div>
                        </div>

                        {/* Configuração de Horário Manual / Override */}
                        <div className="pt-2 border-t border-white/10 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-300 font-medium">Prefere fixar um horário exato?</span>
                                {habitResult.isCustomOverride && (
                                    <button
                                        type="button"
                                        onClick={handleResetToAutomatic}
                                        className="text-primary-light hover:underline font-bold min-h-[44px] px-2 py-1 inline-flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    >
                                        Restaurar automático
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                                <input
                                    type="time"
                                    value={customTimeInput}
                                    onChange={(e) => setCustomTimeInput(e.target.value)}
                                    aria-label="Definir horário preferido de treino"
                                    className="min-h-[44px] px-3.5 py-2.5 bg-slate-950/60 border border-white/20 rounded-xl text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={handleSaveManualTime}
                                    className="min-h-[44px] px-4 py-2.5 bg-primary hover:bg-primary-dark text-slate-950 font-bold text-xs rounded-xl shadow-soft active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                                >
                                    Fixar horário
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                {/* Tópicos de Alertas */}
                <section className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] ml-2">
                        Tópicos de Notificação
                    </h3>
                    <div className="space-y-3">
                        {activeTopics.map((topic) => {
                            const isChecked = Boolean(notifPrefs[topic.key]);
                            return (
                                <div
                                    key={topic.key}
                                    className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-soft flex items-center justify-between gap-4 transition-colors"
                                >
                                    <div className="flex-1 pr-2">
                                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{topic.label}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{topic.desc}</p>
                                    </div>
                                    <ToggleSwitch
                                        id={`topic-${topic.key}`}
                                        checked={isChecked}
                                        onChange={() => handleToggleTopic(topic.key)}
                                        label={`Alternar notificação para ${topic.label}`}
                                        size="sm"
                                    />
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Horário de Silêncio (Quiet Hours) */}
                <section className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-soft space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-warning/10 text-warning flex items-center justify-center">
                            <span className="material-symbols-rounded text-xl" aria-hidden="true">bedtime</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Horário de Silêncio</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Nenhum alerta automático será disparado neste intervalo.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="quiet-start">
                                Início do silêncio
                            </label>
                            <input
                                id="quiet-start"
                                type="time"
                                value={quietStartInput}
                                onChange={(e) => setQuietStartInput(e.target.value)}
                                onBlur={(e) => handleQuietHoursBlur('quiet_hours_start', e.target.value)}
                                className="w-full min-h-[44px] px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="quiet-end">
                                Término do silêncio
                            </label>
                            <input
                                id="quiet-end"
                                type="time"
                                value={quietEndInput}
                                onChange={(e) => setQuietEndInput(e.target.value)}
                                onBlur={(e) => handleQuietHoursBlur('quiet_hours_end', e.target.value)}
                                className="w-full min-h-[44px] px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                        </div>
                    </div>
                </section>

                {/* Central de Notificações Recentes */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">
                            Notificações Recentes
                        </h3>
                        {recentNotifs.some(n => !n.read_at) && (
                            <button
                                type="button"
                                onClick={handleMarkAllAsRead}
                                className="min-h-[44px] px-2.5 py-2 inline-flex items-center text-xs font-bold text-primary-700 dark:text-primary-light hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
                            >
                                Marcar todas como lidas
                            </button>
                        )}
                    </div>

                    {notifsLoading ? (
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-soft text-center">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Carregando histórico...</p>
                        </div>
                    ) : recentNotifs.length === 0 ? (
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-soft text-center space-y-2">
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-500 mx-auto">
                                <span className="material-symbols-rounded text-2xl" aria-hidden="true">done_all</span>
                            </div>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Você está em dia</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Nenhuma notificação recente registrada.</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {recentNotifs.map((notif) => {
                                const isUnread = !notif.read_at;
                                const dateFormatted = new Date(notif.created_at).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });

                                return (
                                    <button
                                        type="button"
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                            isUnread
                                                ? 'bg-white dark:bg-slate-800 border-primary/40 shadow-soft'
                                                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-700/60 opacity-80'
                                        }`}
                                    >
                                        <div
                                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                                notif.topic === 'training_reminder'
                                                    ? 'bg-primary/10 text-primary'
                                                    : notif.topic === 'onboarding_profile'
                                                    ? 'bg-warning/10 text-warning'
                                                    : 'bg-primary/10 text-primary'
                                            }`}
                                        >
                                            <span className="material-symbols-rounded text-lg" aria-hidden="true">
                                                {notif.topic === 'training_reminder'
                                                    ? 'fitness_center'
                                                    : notif.topic === 'onboarding_profile'
                                                    ? 'person'
                                                    : 'notifications'}
                                            </span>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className={`text-xs truncate ${isUnread ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                                                    {notif.title}
                                                </h4>
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0 font-medium">
                                                    {dateFormatted}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed line-clamp-2">
                                                {notif.body}
                                            </p>
                                        </div>

                                        {isUnread && (
                                            <>
                                                <span className="sr-only">Não lida</span>
                                                <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1.5 shadow-sm" aria-hidden="true"></span>
                                            </>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default NotificationsSettings;
