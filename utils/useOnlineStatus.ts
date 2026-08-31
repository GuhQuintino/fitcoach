import { useState, useEffect, useCallback } from 'react';
import { flushOfflineQueue, getPendingSyncCount } from './offlineSyncService';

export interface OnlineStatusState {
    isOnline: boolean;
    pendingCount: number;
    isSyncing: boolean;
    syncNow: () => Promise<{ syncedCount: number; failedCount: number }>;
}

export function useOnlineStatus(onSyncCompleted?: (synced: number) => void): OnlineStatusState {
    const [isOnline, setIsOnline] = useState<boolean>(() => {
        return typeof navigator !== 'undefined' ? navigator.onLine : true;
    });
    const [pendingCount, setPendingCount] = useState<number>(() => getPendingSyncCount());
    const [isSyncing, setIsSyncing] = useState<boolean>(false);

    const refreshPending = useCallback(() => {
        setPendingCount(getPendingSyncCount());
    }, []);

    const syncNow = useCallback(async () => {
        if (!navigator.onLine) {
            return { syncedCount: 0, failedCount: 0 };
        }

        setIsSyncing(true);
        try {
            const res = await flushOfflineQueue();
            refreshPending();
            if (res.syncedCount > 0 && onSyncCompleted) {
                onSyncCompleted(res.syncedCount);
            }
            return { syncedCount: res.syncedCount, failedCount: res.failedCount };
        } finally {
            setIsSyncing(false);
        }
    }, [onSyncCompleted, refreshPending]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Ao reconectar, tenta disparar a sincronização dos treinos offline
            syncNow();
        };

        const handleOffline = () => {
            setIsOnline(false);
            refreshPending();
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Checagem inicial ao montar o componente
        refreshPending();
        if (navigator.onLine && getPendingSyncCount() > 0) {
            syncNow();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [syncNow, refreshPending]);

    return {
        isOnline,
        pendingCount,
        isSyncing,
        syncNow
    };
}
