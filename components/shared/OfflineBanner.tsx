import React from 'react';
import { useOnlineStatus } from '../../utils/useOnlineStatus';
import toast from 'react-hot-toast';

const OfflineBanner: React.FC = () => {
    const { isOnline, pendingCount, isSyncing, syncNow } = useOnlineStatus((synced) => {
        toast.success(`${synced} treino(s) sincronizado(s) com sucesso! ✅`, { id: 'offline-sync-success' });
    });

    // Se estiver online, sem treinos pendentes e não estiver sincronizando, oculta o banner
    if (isOnline && pendingCount === 0 && !isSyncing) {
        return null;
    }

    // Modo Offline ativo: fixo e estável no topo
    if (!isOnline) {
        return (
            <div
                role="status"
                aria-live="polite"
                className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md sticky top-0 z-50 animate-slide-down"
            >
                <div className="flex items-center gap-2">
                    <span className="material-symbols-rounded text-base" aria-hidden="true">wifi_off</span>
                    <span>Modo Offline ativo. Seus dados e treinos estão sendo salvos localmente.</span>
                </div>
                {pendingCount > 0 && (
                    <span className="bg-amber-950/20 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                        {pendingCount} no aparelho
                    </span>
                )}
            </div>
        );
    }

    // Sincronizando em andamento
    if (isSyncing) {
        return (
            <div
                role="status"
                aria-live="polite"
                className="bg-sky-500 text-white px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 shadow-md sticky top-0 z-50 animate-slide-down"
            >
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
                <span>Conexão restabelecida! Sincronizando {pendingCount} treino(s)...</span>
            </div>
        );
    }

    // Online com itens pendentes
    if (isOnline && pendingCount > 0) {
        return (
            <div
                role="status"
                aria-live="polite"
                className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md sticky top-0 z-50 animate-slide-down"
            >
                <div className="flex items-center gap-2">
                    <span className="material-symbols-rounded text-base" aria-hidden="true">cloud_sync</span>
                    <span>Conectado à internet. Sincronizando {pendingCount} treino(s)...</span>
                </div>
                <button
                    type="button"
                    onClick={() => syncNow()}
                    aria-label="Sincronizar treinos pendentes agora"
                    className="min-h-[44px] px-4 py-2 bg-white text-emerald-800 rounded-xl text-xs font-extrabold hover:bg-emerald-50 active:scale-95 transition-all shadow-sm flex items-center justify-center cursor-pointer"
                >
                    Sincronizar
                </button>
            </div>
        );
    }

    return null;
};

export default OfflineBanner;
