import React from 'react';
import { useOnlineStatus } from '../../utils/useOnlineStatus';
import toast from 'react-hot-toast';

const OfflineSyncStatus: React.FC = () => {
    const { isOnline, pendingCount, isSyncing, syncNow } = useOnlineStatus((synced) => {
        toast.success(`${synced} treino(s) salvo(s) no servidor com sucesso! 🎉`);
    });

    if (pendingCount === 0) return null;

    return (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-soft my-2">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-rounded text-xl">
                        {isSyncing ? 'sync' : 'cloud_off'}
                    </span>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {pendingCount} treino{pendingCount > 1 ? 's' : ''} aguardando envio
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {isOnline
                            ? 'Internet disponível. Pronto para sincronizar.'
                            : 'Salvos no aparelho. Serão enviados quando a internet voltar.'}
                    </p>
                </div>
            </div>

            {isOnline && (
                <button
                    onClick={() => syncNow()}
                    disabled={isSyncing}
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
                >
                    {isSyncing ? (
                        <>
                            <div className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                            <span>Enviando...</span>
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-rounded text-sm">upload</span>
                            <span>Enviar</span>
                        </>
                    )}
                </button>
            )}
        </div>
    );
};

export default OfflineSyncStatus;
