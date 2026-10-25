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
            className={`bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-400/15 dark:via-amber-400/5 dark:to-transparent border border-amber-200/80 dark:border-amber-500/30 rounded-3xl p-5 relative overflow-hidden transition-all ${className}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 min-w-[40px] rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-rounded text-xl" aria-hidden="true">account_circle</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                Complete seu perfil
                            </h3>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                                {completeness.completionPercentage}% pronto
                            </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            Faltam dados essenciais ({missingNames}) para que seu treinador possa calibrar suas cargas e metas com precisão.
                        </p>

                        <div className="mt-3 flex items-center gap-3">
                            <Link
                                to="/student/profile"
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-sm active:scale-95 transition-transform"
                            >
                                <span>Preencher agora</span>
                                <span className="material-symbols-rounded text-sm" aria-hidden="true">arrow_forward</span>
                            </Link>
                            <button
                                type="button"
                                onClick={() => setDismissed(true)}
                                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 py-1 px-2 font-medium transition-colors"
                            >
                                Lembrar depois
                            </button>
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setDismissed(true)}
                    aria-label="Fechar aviso"
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                >
                    <span className="material-symbols-rounded text-lg" aria-hidden="true">close</span>
                </button>
            </div>
        </section>
    );
};
