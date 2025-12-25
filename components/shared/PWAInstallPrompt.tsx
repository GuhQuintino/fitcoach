import React, { useState, useEffect } from 'react';

const PWAInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [platform, setPlatform] = useState<'android' | 'ios' | 'other'>('other');

    useEffect(() => {
        // Check if already in standalone mode (installed)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone
            || document.referrer.includes('android-app://');

        if (isStandalone) return;

        // Platform detection
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(userAgent)) {
            setPlatform('ios');
            // Check if we should show iOS prompt (not standalone)
            setShowBanner(true);
        } else if (/android/.test(userAgent)) {
            setPlatform('android');
        }

        // Handle Android install prompt
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

    if (!showBanner) return null;

    return (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-emerald-900/40 dark:to-slate-900 p-4 rounded-2xl shadow-lg border border-white/10 mb-6 relative overflow-hidden group">
            {/* Decorative background circle */}
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>

            <div className="relative z-10 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0 animate-pulse">
                    <span className="material-symbols-rounded text-white text-2xl">download</span>
                </div>

                <div className="flex-1">
                    <h3 className="text-white font-bold text-sm">Instalar FitCoach Pro</h3>
                    <p className="text-white/70 text-[11px] leading-tight mt-0.5">
                        {platform === 'ios'
                            ? 'Toque em compartilhar e "Adicionar à Tela de Início"'
                            : 'Baixe o app para ter acesso rápido e offline.'}
                    </p>
                </div>

                {platform === 'android' ? (
                    <button
                        onClick={handleInstallClick}
                        className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                    >
                        Instalar
                    </button>
                ) : platform === 'ios' ? (
                    <div className="flex items-center gap-1.5 bg-white/10 px-3 py-2 rounded-lg border border-white/5">
                        <span className="material-symbols-rounded text-white text-lg">ios_share</span>
                        <span className="material-symbols-rounded text-white text-lg">add_box</span>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowBanner(false)}
                        className="text-white/40 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-rounded">close</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default PWAInstallPrompt;
