import { useState, useEffect, useCallback } from 'react';
import { flushOfflineQueue, getPendingSyncCount } from './offlineSyncService';

export interface OnlineStatusState {
    isOnline: boolean;
    pendingCount: number;
    isSyncing: boolean;
    syncNow: () => Promise<{ syncedCount: number; failedCount: number }>;
    checkConnection: () => Promise<boolean>;
}

// Estado global compartilhado
let globalIsOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
const listeners = new Set<(online: boolean) => void>();
let inFlightProbe: Promise<boolean> | null = null;
let visibilityDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function setGlobalOnline(online: boolean) {
    if (globalIsOnline !== online) {
        globalIsOnline = online;
        listeners.forEach(fn => fn(online));
    }
}

/** Notifica que uma chamada de rede falhou (só marca offline imediato se navigator.onLine for false, senão confirma via probe) */
export function notifyNetworkError(): void {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setGlobalOnline(false);
        return;
    }
    probeInternetConnection();
}

/** Notifica imediatamente que uma chamada de rede teve sucesso */
export function notifyNetworkSuccess(): void {
    setGlobalOnline(true);
}

async function executeSingleProbe(timeoutMs: number = 3500): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
        const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';

        if (supabaseUrl && !supabaseUrl.includes('mock')) {
            const res = await fetch(`${supabaseUrl}/rest/v1/`, {
                method: 'HEAD',
                headers: { apikey: supabaseAnonKey },
                signal: controller.signal,
                cache: 'no-store'
            });
            clearTimeout(timeoutId);
            return res.ok || res.status < 500;
        } else {
            const res = await fetch(`/manifest.json?_t=${Date.now()}`, {
                method: 'HEAD',
                signal: controller.signal,
                cache: 'no-store'
            });
            clearTimeout(timeoutId);
            return res.ok;
        }
    } catch {
        clearTimeout(timeoutId);
        return false;
    }
}

/**
 * Realiza uma checagem real de conectividade deduplicada (singleton in-flight)
 * e com retentativa curta para evitar falso-negativo ao desbloquear a tela do celular.
 */
export async function probeInternetConnection(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setGlobalOnline(false);
        return false;
    }

    if (inFlightProbe) {
        return inFlightProbe;
    }

    inFlightProbe = (async () => {
        try {
            const firstTry = await executeSingleProbe(3500);
            if (firstTry) {
                setGlobalOnline(true);
                return true;
            }

            // Se falhou na primeira tentativa mas o sistema diz que há rede (ex: celular acabou de ser desbloqueado),
            // aguarda 900ms para o rádio 4G/Wi-Fi reabrir o socket antes de exibir o banner offline.
            if (typeof navigator === 'undefined' || navigator.onLine) {
                await new Promise(r => setTimeout(r, 900));
                const secondTry = await executeSingleProbe(3500);
                setGlobalOnline(secondTry);
                return secondTry;
            }

            setGlobalOnline(false);
            return false;
        } finally {
            inFlightProbe = null;
        }
    })();

    return inFlightProbe;
}

export function useOnlineStatus(onSyncCompleted?: (synced: number) => void): OnlineStatusState {
    const [isOnline, setIsOnline] = useState<boolean>(globalIsOnline);
    const [pendingCount, setPendingCount] = useState<number>(() => getPendingSyncCount());
    const [isSyncing, setIsSyncing] = useState<boolean>(false);

    const refreshPending = useCallback(() => {
        setPendingCount(getPendingSyncCount());
    }, []);

    const syncNow = useCallback(async () => {
        const hasNet = await probeInternetConnection();
        if (!hasNet) {
            return { syncedCount: 0, failedCount: 0 };
        }

        setIsSyncing(true);
        try {
            const res = await flushOfflineQueue();
            refreshPending();
            if (res.syncedCount > 0 && onSyncCompleted) {
                onSyncCompleted(res.syncedCount);
            }
            if (res.failedCount > 0) {
                probeInternetConnection();
            }
            return { syncedCount: res.syncedCount, failedCount: res.failedCount };
        } finally {
            setIsSyncing(false);
        }
    }, [onSyncCompleted, refreshPending]);

    useEffect(() => {
        const updateOnline = (online: boolean) => {
            setIsOnline(online);
            if (online && getPendingSyncCount() > 0) {
                syncNow();
            }
        };

        listeners.add(updateOnline);

        const handleBrowserOnline = async () => {
            const reallyOnline = await probeInternetConnection();
            if (reallyOnline) {
                syncNow();
            }
        };

        const handleBrowserOffline = () => {
            setGlobalOnline(false);
            refreshPending();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refreshPending();
                // Debounce de 1.2s ao voltar ao app para não testar o socket antes do Wi-Fi/4G acordar
                if (visibilityDebounceTimer) clearTimeout(visibilityDebounceTimer);
                visibilityDebounceTimer = setTimeout(() => {
                    probeInternetConnection();
                }, 1200);
            }
        };

        window.addEventListener('online', handleBrowserOnline);
        window.addEventListener('offline', handleBrowserOffline);
        window.addEventListener('focus', handleVisibilityChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        refreshPending();

        const intervalId = setInterval(() => {
            if (typeof document === 'undefined' || document.visibilityState === 'visible') {
                probeInternetConnection();
                refreshPending();
            }
        }, 15000);

        return () => {
            if (visibilityDebounceTimer) clearTimeout(visibilityDebounceTimer);
            listeners.delete(updateOnline);
            clearInterval(intervalId);
            window.removeEventListener('online', handleBrowserOnline);
            window.removeEventListener('offline', handleBrowserOffline);
            window.removeEventListener('focus', handleVisibilityChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [syncNow, refreshPending]);

    return {
        isOnline,
        pendingCount,
        isSyncing,
        syncNow,
        checkConnection: probeInternetConnection
    };
}
