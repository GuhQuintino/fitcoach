import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ProfileCompletenessResult } from '../../types/notifications';

interface ProfileCompletionBannerProps {
    completeness: ProfileCompletenessResult;
    className?: string;
}

export const ProfileCompletionBanner: React.FC<ProfileCompletionBannerProps> = ({
    completeness,
    className = ''
}) => {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed || completeness.isComplete) {
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

    return (
        <section
            aria-label="Aviso para completar perfil"
            className={`bg-gradient-to-r from-warning/15 via-warning/5 to-transparent dark:from-warning/20 dark:via-warning/5 dark:to-transparent border border-warning/30 dark:border-warning/40 rounded-3xl p-5 relative overflow-hidden transition-all shadow-soft ${className}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 min-w-[40px] rounded-2xl bg-warning/20 text-warning-dark dark:text-warning-light flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-rounded text-xl" aria-hidden="true">account_circle</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                                Complete seu perfil
                            </h2>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-warning/20 text-warning-dark dark:text-warning-light border border-warning/30">
                                {completeness.completionPercentage}% pronto
                            </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            Faltam dados essenciais ({missingNames}) para que seu treinador possa calibrar suas cargas e metas com precisão.
                        </p>

                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <Link
                                to="/student/profile"
                                state={{ autoEdit: true }}
                                className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 bg-warning hover:bg-warning-dark text-slate-950 font-bold text-xs rounded-xl shadow-soft active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800"
                            >
                                <span>Preencher agora</span>
                                <span className="material-symbols-rounded text-sm" aria-hidden="true">arrow_forward</span>
                            </Link>
                            <button
                                type="button"
                                onClick={() => setDismissed(true)}
                                className="min-h-[44px] px-3 py-2 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-semibold inline-flex items-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning"
                            >
                                Lembrar depois
                            </button>
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setDismissed(true)}
                    aria-label="Fechar aviso de perfil incompleto"
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 -mt-2 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning"
                >
                    <span className="material-symbols-rounded text-lg" aria-hidden="true">close</span>
                </button>
            </div>
        </section>
    );
};

export default React.memo(ProfileCompletionBanner);
