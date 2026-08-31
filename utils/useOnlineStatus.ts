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

function setGlobalOnline(online: boolean) {
    if (globalIsOnline !== online) {
        globalIsOnline = online;
        listeners.forEach(fn => fn(online));
    }
}

/** Notifica imediatamente que uma chamada de rede falhou */
export function notifyNetworkError(): void {
    setGlobalOnline(false);
}

/** Notifica imediatamente que uma chamada de rede teve sucesso */
export function notifyNetworkSuccess(): void {
    setGlobalOnline(true);
}

/**
 * Realiza uma checagem real de conectividade probe no Supabase ou endpoint sem cache.
 * Evita os falsos-positivos comuns de `navigator.onLine` em dispositivos móveis.
 */
export async function probeInternetConnection(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setGlobalOnline(false);
        return false;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
        const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';

        // Pinging Supabase REST endpoint directly (never cached by SW)
        if (supabaseUrl && !supabaseUrl.includes('mock')) {
            const res = await fetch(`${supabaseUrl}/rest/v1/`, {
                method: 'HEAD',
                headers: { apikey: supabaseAnonKey },
                signal: controller.signal,
                cache: 'no-store'
            });
            clearTimeout(timeoutId);
            const isConnected = res.ok || res.status < 500;
            setGlobalOnline(isConnected);
            return isConnected;
        } else {
            const res = await fetch(`/manifest.json?_t=${Date.now()}`, {
                method: 'HEAD',
                signal: controller.signal,
                cache: 'no-store'
            });
            clearTimeout(timeoutId);
            setGlobalOnline(res.ok);
            return res.ok;
        }
    } catch {
        setGlobalOnline(false);
        return false;
    }
}

export function useOnlineStatus(onSyncCompleted?: (synced: number) => void): OnlineStatusState {
    const [isOnline, setIsOnline] = useState<boolean>(globalIsOnline);
    const [pendingCount, setPendingCount] = useState<number>(() => getPendingSyncCount());
    const [isSyncing, setIsSyncing] = useState<boolean>(false);

    const refreshPending = useCallback(() => {
        setPendingCount(getPendingSyncCount());
    }, []);

    const syncNow = useCallback(async () => {
        // Primeiro valida se há conexão real antes de tentar o flush
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
                // Se algum item falhou por rede, marca offline
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
                probeInternetConnection();
                refreshPending();
            }
        };

        window.addEventListener('online', handleBrowserOnline);
        window.addEventListener('offline', handleBrowserOffline);
        window.addEventListener('focus', handleVisibilityChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Checagem ativa no mount
        refreshPending();
        probeInternetConnection();

        // Heartbeat probe periódico (a cada 12 segundos)
        const intervalId = setInterval(() => {
            probeInternetConnection();
            refreshPending();
        }, 12000);

        return () => {
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
