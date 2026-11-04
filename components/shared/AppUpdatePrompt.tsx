import React, { useEffect, useState } from 'react';
import { AppReleaseUpdate, watchAppUpdates } from '../../utils/appUpdateService';

declare const __APP_BUILD_ID__: string;

export default function AppUpdatePrompt() {
    const [update, setUpdate] = useState<AppReleaseUpdate | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        if (import.meta.env.DEV) return;
        return watchAppUpdates(__APP_BUILD_ID__, setUpdate);
    }, []);
    if (!update) return null;
    const apply = async () => {
        setBusy(true);
        setError('');
        try { await update.apply(); }
        catch { setError('Não foi possível atualizar. Confira sua conexão e tente novamente.'); setBusy(false); }
    };
    return (
        <aside role="status" aria-live="polite" aria-label="Atualização do aplicativo" className="fixed z-[200] bottom-24 left-3 right-3 mx-auto max-w-md rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-4 shadow-xl">
            <h2 className="font-bold text-base">Nova versão disponível</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Atualize para receber as melhorias. O app será reaberto.</p>
            {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300 mt-2">{error}</p>}
            <div className="flex justify-end gap-2 mt-3">
                <button type="button" disabled={busy} onClick={() => setUpdate(null)} className="min-h-11 px-3 rounded-xl text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600 disabled:opacity-50">Mais tarde</button>
                <button type="button" disabled={busy} onClick={() => void apply()} className="min-h-11 px-4 rounded-xl bg-sky-700 text-white text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:opacity-50">{busy ? 'Atualizando…' : 'Atualizar agora'}</button>
            </div>
        </aside>
    );
}
