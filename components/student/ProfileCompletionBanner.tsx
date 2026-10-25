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
    const [isExpanded, setIsExpanded] = useState(false);

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

    const fieldIcons: Record<string, string> = {
        avatar_url: 'photo_camera',
        weight_kg: 'monitor_weight',
        birth_date: 'calendar_today',
        height_cm: 'height'
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
            aria-label="Aviso para completar perfil"
            className={`bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-3 sm:p-3.5 shadow-soft transition-all relative motion-reduce:transition-none ${className}`}
        >
            {/* Linha Principal (Sempre limpa, legível e nunca truncada) */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-3">
                {/* Lado Esquerdo: Ícone + Título + Porcentagem */}
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] sm:min-w-[36px] rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <span className="material-symbols-rounded text-lg sm:text-xl" aria-hidden="true">account_circle</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <h2 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white whitespace-nowrap">
                            Complete seu perfil
                        </h2>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300 shrink-0">
                            {completeness.completionPercentage}%
                        </span>
                    </div>
                </div>

                {/* Lado Direito: Botão Expansor ("Ver mais" / setinha) + Botão Fechar (X) */}
                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => setIsExpanded(prev => !prev)}
                        aria-expanded={isExpanded}
                        aria-controls="profile-banner-details"
                        aria-label={isExpanded ? 'Recolher detalhes do perfil' : 'Ver mais detalhes do perfil'}
                        className="min-h-[44px] px-2 sm:px-2.5 py-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-light hover:text-primary-700 dark:hover:text-primary hover:bg-primary/10 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
                    >
                        <span>{isExpanded ? 'Ver menos' : 'Ver mais'}</span>
                        <span
                            className={`material-symbols-rounded text-lg transition-transform duration-200 motion-reduce:transition-none ${isExpanded ? 'rotate-180' : ''}`}
                            aria-hidden="true"
                        >
                            expand_more
                        </span>
                    </button>
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

            {/* Painel Expansível: Detalhes, Badges dos campos pendentes e Ações */}
            {isExpanded && (
                <div
                    id="profile-banner-details"
                    className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-3 animate-fade-in"
                >
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Falta <strong className="font-semibold text-slate-800 dark:text-slate-200">{missingNames}</strong> para calibrar seus treinos e cargas com precisão.
                    </p>

                    {completeness.missingFields.length > 0 && (
                        <div className="flex flex-wrap gap-1.5" aria-label="Campos pendentes">
                            {completeness.missingFields.map(field => (
                                <span
                                    key={field}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-600/40"
                                >
                                    <span className="material-symbols-rounded text-xs text-amber-500" aria-hidden="true">
                                        {fieldIcons[field] || 'pending'}
                                    </span>
                                    {fieldLabels[field] || field}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={handleSnooze}
                            aria-label="Adiar lembrete por 3 dias"
                            className="min-h-[44px] px-3.5 py-2 inline-flex items-center justify-center text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                        >
                            Lembrar depois
                        </button>
                        <Link
                            to="/student/profile"
                            state={{ autoEdit: true }}
                            className="min-h-[44px] px-4 py-2 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all active:scale-95 inline-flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none"
                        >
                            <span>Preencher perfil</span>
                            <span className="material-symbols-rounded text-sm" aria-hidden="true">arrow_forward</span>
                        </Link>
                    </div>
                </div>
            )}
        </section>
    );
};

export default React.memo(ProfileCompletionBanner);
