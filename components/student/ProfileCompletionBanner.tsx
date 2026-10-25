import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { ProfileCompletenessResult } from '../../types/notifications';

interface ProfileCompletionBannerProps {
    completeness: ProfileCompletenessResult;
    className?: string;
}

export const ProfileCompletionBanner: React.FC<ProfileCompletionBannerProps> = ({
    completeness,
    className = ''
}) => {
    const { user, preferences, updatePreferences } = useAuth();
    const [dismissed, setDismissed] = useState(false);

    // 1. Verifica se o usuário desativou permanentemente nas configurações de notificações
    const isTopicEnabled = (preferences?.notifications as any)?.profile_completion !== false;

    // 2. Verifica se o aviso foi adiado (snooze de 3 dias) no localStorage ou no Supabase
    const isSnoozed = useMemo(() => {
        if (!user?.id) return false;
        const localSnooze = localStorage.getItem(`fc_profile_banner_snoozed_${user.id}`);
        const prefSnooze = (preferences?.notifications as any)?.profile_completion_snoozed_until;
        const latestSnooze = localSnooze || prefSnooze;
        if (!latestSnooze) return false;
        return new Date(latestSnooze).getTime() > Date.now();
    }, [user?.id, preferences]);

    // Se estiver completo, desativado nas preferências, adiado ou fechado na sessão, não renderiza
    if (dismissed || !isTopicEnabled || isSnoozed || completeness.isComplete) {
        return null;
    }

    const fieldLabels: Record<string, string> = {
        avatar_url: 'Foto',
        weight_kg: 'Peso',
        birth_date: 'Idade',
        height_cm: 'Altura'
    };

    const missingNames = completeness.missingFields
        .map(f => fieldLabels[f] || f)
        .join(', ');

    // Adia a exibição por 3 dias
    const handleSnooze = async () => {
        setDismissed(true);
        if (!user?.id) return;

        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        const snoozedUntil = new Date(Date.now() + threeDaysMs).toISOString();

        try {
            // Salva tanto no cache local quanto no perfil do Supabase para persistência cross-device
            localStorage.setItem(`fc_profile_banner_snoozed_${user.id}`, snoozedUntil);
            await updatePreferences({
                notifications: {
                    ...((preferences?.notifications as any) || {}),
                    profile_completion_snoozed_until: snoozedUntil
                }
            } as any);
            toast('Lembrete adiado por 3 dias.', { icon: '⏰' });
        } catch (err) {
            console.warn('[ProfileBanner] Falha ao salvar adiamento:', err);
        }
    };

    return (
        <section
            aria-label="Aviso discreto para completar perfil"
            className={`bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-3.5 shadow-soft transition-all relative motion-reduce:transition-none ${className}`}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 min-w-[40px] rounded-xl bg-warning/15 text-warning flex items-center justify-center shrink-0">
                        <span className="material-symbols-rounded text-xl" aria-hidden="true">account_circle</span>
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                Complete seu perfil
                            </h2>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-warning/20 text-warning-dark dark:text-warning-light">
                                {completeness.completionPercentage}%
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-0.5">
                            Falta {missingNames} para calibrar treinos
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={handleSnooze}
                        aria-label="Adiar lembrete por 3 dias"
                        className="min-h-[44px] px-2.5 py-2 inline-flex items-center text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                    >
                        Lembrar depois
                    </button>
                    <Link
                        to="/student/profile"
                        state={{ autoEdit: true }}
                        className="min-h-[44px] px-3.5 py-2 bg-primary/20 hover:bg-primary/30 text-primary-700 dark:text-primary-light font-bold text-xs rounded-xl transition-all border border-primary/30 active:scale-95 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
                    >
                        <span>Preencher</span>
                        <span className="material-symbols-rounded text-sm" aria-hidden="true">arrow_forward</span>
                    </Link>
                    <button
                        type="button"
                        onClick={handleSnooze}
                        title="Adiar lembrete por 3 dias"
                        aria-label="Fechar e adiar por 3 dias"
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <span className="material-symbols-rounded text-lg" aria-hidden="true">close</span>
                    </button>
                </div>
            </div>
        </section>
    );
};

export default React.memo(ProfileCompletionBanner);
