import React from 'react';
import { useOnlineStatus } from '../../utils/useOnlineStatus';
import toast from 'react-hot-toast';

const OfflineSyncStatus: React.FC = () => {
    const { isOnline, pendingCount, isSyncing, syncNow } = useOnlineStatus((synced) => {
        toast.success(`${synced} treino(s) salvo(s) no servidor com sucesso! 🎉`);
    });

    if (pendingCount === 0) return null;

    return (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-soft my-2 animate-fade-in">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isOnline ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'
                }`}>
                    <span className={`material-symbols-rounded text-xl ${isSyncing ? 'animate-spin' : ''}`}>
                        {isSyncing ? 'sync' : isOnline ? 'cloud_sync' : 'cloud_off'}
                    </span>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {pendingCount} treino{pendingCount > 1 ? 's' : ''} {isOnline ? 'pronto(s) para envio' : 'salvo(s) no aparelho'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {isOnline
                            ? (isSyncing ? 'Enviando dados para o servidor...' : 'Internet disponível. Sincronizando...')
                            : 'Será enviado automaticamente assim que a internet voltar.'}
                    </p>
                </div>
            </div>

            {/* O botão de envio só aparece quando houver internet real */}
            {isOnline && (
                <button
                    type="button"
                    onClick={() => syncNow()}
                    disabled={isSyncing}
                    aria-label="Sincronizar dados pendentes agora"
                    className="min-h-[44px] px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 flex-shrink-0 disabled:opacity-50"
                >
                    {isSyncing ? (
                        <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
                            <span>Enviando</span>
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-rounded text-base" aria-hidden="true">cloud_upload</span>
                            <span>Enviar</span>
                        </>
                    )}
                </button>
            )}
        </div>
    );
};

export default OfflineSyncStatus;
