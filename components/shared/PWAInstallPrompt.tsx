import React, { useState, useEffect } from 'react';

const SNOOZE_STORAGE_KEY = 'fc_pwa_install_dismissed_until';

const PWAInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [platform, setPlatform] = useState<'android' | 'ios' | 'other'>('other');

    useEffect(() => {
        // Verifica se já está em modo standalone (PWA instalado)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone
            || document.referrer.includes('android-app://');

        if (isStandalone) return;

        // Verifica se o usuário já dispensou este aviso nos últimos 7 dias
        try {
            const dismissedUntil = localStorage.getItem(SNOOZE_STORAGE_KEY);
            if (dismissedUntil && new Date(dismissedUntil).getTime() > Date.now()) {
                return;
            }
        } catch (e) {
            // Ignora falhas de acesso ao storage
        }

        // Detecção de plataforma
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(userAgent)) {
            setPlatform('ios');
            setShowBanner(true);
        } else if (/android/.test(userAgent)) {
            setPlatform('android');
        }

        // Listener nativo do Chrome para instalação no Android
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowBanner(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setShowBanner(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowBanner(false);
        try {
            // Adia por 7 dias para não ser invasivo com o usuário
            const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
            localStorage.setItem(SNOOZE_STORAGE_KEY, nextWeek);
        } catch (e) {
            // Ignora erro de storage
        }
    };

    if (!showBanner) return null;

    return (
        <div
            role="region"
            aria-label="Instalação do FitCoach Pro"
            className="bg-slate-900 dark:bg-slate-800 p-4 rounded-2xl shadow-soft border border-white/10 relative overflow-hidden group"
        >
            {/* Elemento decorativo sutil */}
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>

            <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                        <span className="material-symbols-rounded text-white text-xl" aria-hidden="true">download</span>
                    </div>

                    <div className="min-w-0">
                        <h3 className="text-white font-bold text-sm truncate">Instalar FitCoach Pro</h3>
                        <p className="text-slate-200 text-[11px] leading-snug mt-0.5 line-clamp-2">
                            {platform === 'ios'
                                ? 'Toque em compartilhar e "Adicionar à Tela de Início"'
                                : 'Acesso rápido com suporte a notificações e offline.'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {platform === 'android' && (
                        <button
                            type="button"
                            onClick={handleInstallClick}
                            aria-label="Instalar FitCoach Pro agora"
                            className="min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-emerald-600/30 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 motion-reduce:transition-none"
                        >
                            Instalar
                        </button>
                    )}

                    {platform === 'ios' && (
                        <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/5" aria-hidden="true">
                            <span className="material-symbols-rounded text-white text-base">ios_share</span>
                            <span className="material-symbols-rounded text-white text-base">add_box</span>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleDismiss}
                        title="Dispensar por 7 dias"
                        aria-label="Dispensar aviso de instalação por 7 dias"
                        className="min-w-[44px] min-h-[44px] text-slate-400 hover:text-white transition-colors flex items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                        <span className="material-symbols-rounded text-lg" aria-hidden="true">close</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default React.memo(PWAInstallPrompt);
