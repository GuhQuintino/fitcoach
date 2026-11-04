export interface AppReleaseUpdate {
    apply: () => Promise<void>;
}

/** Detect releases on launch, return from background, reconnect, and while open. */
export function watchAppUpdates(currentVersion: string, onAvailable: (update: AppReleaseUpdate) => void): () => void {
    let disposed = false;
    let checking = false;
    let announced = false;
    let registration: ServiceWorkerRegistration | undefined;
    const cleanups: Array<() => void> = [];
    const announce = () => {
        if (disposed || announced) return;
        announced = true;
        onAvailable({ apply: async () => {
            // Do not reload into an offline cache when the user accepts the release.
            const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
            if (!response.ok) throw new Error('Não foi possível baixar a atualização.');
            const release = await response.json();
            if (typeof release.version !== 'string') throw new Error('Atualização indisponível.');
            const waiting = registration?.waiting;
            if (waiting && 'serviceWorker' in navigator) {
                await new Promise<void>((resolve, reject) => {
                    const container = navigator.serviceWorker;
                    const changed = () => { clearTimeout(timeout); container.removeEventListener('controllerchange', changed); resolve(); };
                    const timeout = setTimeout(() => {
                        container.removeEventListener('controllerchange', changed);
                        reject(new Error('A atualização está demorando. Tente novamente.'));
                    }, 10000);
                    container.addEventListener('controllerchange', changed);
                    waiting.postMessage({ type: 'SKIP_WAITING' });
                });
            }
            window.location.reload();
        } });
    };
    const check = async () => {
        if (disposed || checking || document.visibilityState === 'hidden') return;
        checking = true;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
            if (registration) {
                void registration.update().catch(error => console.debug('[App update] Worker offline:', error));
                if (registration.waiting && navigator.serviceWorker.controller) announce();
            }
            const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store', signal: controller.signal });
            if (!response.ok) return;
            const release = await response.json();
            if (typeof release.version === 'string' && release.version !== currentVersion) announce();
        } catch (error) {
            // Offline use remains available; the next foreground/online check retries.
            console.debug('[App update] Check deferred:', error);
        } finally {
            clearTimeout(timeout);
            checking = false;
        }
    };
    if ('serviceWorker' in navigator) {
        void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(value => {
            if (disposed) return;
            registration = value;
            if (value.waiting && navigator.serviceWorker.controller) announce();
            const observeInstalling = () => {
                const worker = value.installing;
                if (!worker) return;
                const stateChanged = () => {
                    if (worker.state === 'installed' && navigator.serviceWorker.controller) announce();
                };
                worker.addEventListener('statechange', stateChanged);
                cleanups.push(() => worker.removeEventListener('statechange', stateChanged));
                stateChanged();
            };
            value.addEventListener('updatefound', observeInstalling);
            cleanups.push(() => value.removeEventListener('updatefound', observeInstalling));
            observeInstalling();
            void check();
        }).catch(error => console.warn('[App update] Registration failed:', error));
    }
    const onForeground = () => { void check(); };
    window.addEventListener('focus', onForeground);
    window.addEventListener('online', onForeground);
    document.addEventListener('visibilitychange', onForeground);
    const interval = setInterval(onForeground, 60000);
    void check();
    return () => {
        disposed = true;
        clearInterval(interval);
        window.removeEventListener('focus', onForeground);
        window.removeEventListener('online', onForeground);
        document.removeEventListener('visibilitychange', onForeground);
        cleanups.forEach(cleanup => cleanup());
    };
}
