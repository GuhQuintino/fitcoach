const CACHE_NAME = 'fitcoach-v12';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon.svg',
    '/icon-192.png',
    '/icon-512.png',
    '/icon-maskable-192.png',
    '/icon-maskable-512.png',
    '/index.css'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const isSelfOrigin = url.origin === self.location.origin;
    const isApiCall = url.hostname.includes('supabase.co');
    const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

    // NEVER cache Supabase API calls
    if (isApiCall) {
        return;
    }

    // NEVER intercept video or audio media requests or Range requests in the service worker.
    // Browsers require native HTTP 206 Partial Content handling for video streaming and seeking (#t=0.1).
    const isMedia = url.pathname.match(/\.(mp4|webm|ogg|mov|mp3|wav)($|\?)/i) ||
                    event.request.headers.has('range') ||
                    event.request.destination === 'video' ||
                    event.request.destination === 'audio';

    if (isMedia) {
        return;
    }

    // Cache Google Fonts & Material Symbols (Cache First with network refresh)
    if (isFont) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                }).catch(() => {
                    return new Response('', { status: 408, statusText: 'Font unavailable offline' });
                });
            })
        );
        return;
    }

    // Navigation requests: Network First with 2.5s timeout fallback to cached /index.html
    if (event.request.mode === 'navigate' || (isSelfOrigin && (url.pathname === '/' || url.pathname === '/index.html'))) {
        event.respondWith(
            new Promise((resolve) => {
                let settled = false;
                const timeoutId = setTimeout(() => {
                    if (settled) return;
                    settled = true;
                    caches.match('/index.html').then((cached) => {
                        resolve(cached || caches.match('/'));
                    });
                }, 2500);

                fetch(event.request)
                    .then((response) => {
                        if (settled) return;
                        settled = true;
                        clearTimeout(timeoutId);
                        if (response && response.status === 200) {
                            const clonedResponse = response.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, clonedResponse);
                            });
                        }
                        resolve(response);
                    })
                    .catch(() => {
                        if (settled) return;
                        settled = true;
                        clearTimeout(timeoutId);
                        caches.match('/index.html').then((response) => {
                            resolve(response || caches.match('/'));
                        });
                    });
            })
        );
        return;
    }

    // Static assets (JS, CSS, images, etc.) from same origin: Stale While Revalidate
    if (isSelfOrigin) {
        event.respondWith(
            caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                }).catch(() => {
                    return cachedResponse;
                });

                return cachedResponse || fetchPromise;
            })
        );
    }
});

// --- Background Rest Timer Notification Scheduler ---
let restTimerTimeoutId = null;

self.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || !data.type) return;

    if (data.type === 'CANCEL_REST_TIMER') {
        if (restTimerTimeoutId) {
            clearTimeout(restTimerTimeoutId);
            restTimerTimeoutId = null;
        }
        return;
    }

    if (data.type === 'SCHEDULE_REST_TIMER' && typeof data.endTime === 'number') {
        if (restTimerTimeoutId) {
            clearTimeout(restTimerTimeoutId);
            restTimerTimeoutId = null;
        }

        const delayMs = Math.max(0, data.endTime - Date.now());

        const timerPromise = new Promise((resolve) => {
            restTimerTimeoutId = setTimeout(async () => {
                restTimerTimeoutId = null;
                try {
                    await self.registration.showNotification(
                        data.title || 'FitCoach Pro — Descanso Finalizado! 💪',
                        {
                            body: data.body || 'Descanso finalizado! Hora da próxima série 💪',
                            icon: '/icon-192.png',
                            badge: '/icon-192.png',
                            tag: 'fitcoach-rest-timer',
                            renotify: true,
                            requireInteraction: false,
                            vibrate: [300, 120, 300, 120, 450],
                            data: { url: data.url || '/student/dashboard' }
                        }
                    );
                } catch (err) {
                    // Ignore if permission was revoked
                }
                resolve();
            }, delayMs);
        });

        if (event.waitUntil) {
            event.waitUntil(timerPromise);
        }
    }
});

// --- Web Push Notification Handler ---
self.addEventListener('push', (event) => {
    let payload = {
        title: 'FitCoach Pro 💪',
        body: 'Você tem uma nova notificação de treino.',
        action_url: '/student/dashboard',
        topic: 'general'
    };

    if (event.data) {
        try {
            payload = Object.assign(payload, event.data.json());
        } catch (e) {
            payload.body = event.data.text();
        }
    }

    const title = payload.title || 'FitCoach Pro 💪';
    const notificationOptions = {
        body: payload.body,
        icon: payload.icon || '/icon-192.png',
        badge: payload.badge || '/icon-192.png',
        tag: payload.tag || `fitcoach-notif-${payload.topic || 'general'}`,
        renotify: payload.renotify ?? true,
        requireInteraction: false,
        vibrate: payload.vibrate || [250, 100, 250],
        data: {
            url: payload.action_url || payload.url || '/student/dashboard',
            notificationId: payload.id || null,
            topic: payload.topic || 'general'
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, notificationOptions)
    );
});

// --- Unificação do Evento de Clique em Notificações ---
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const notifData = event.notification.data || {};
    const targetUrl = notifData.url || '/student/dashboard';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Se já houver aba ou janela do Fitcoach aberta no mesmo domínio
            for (const client of clientList) {
                const clientUrl = new URL(client.url, self.location.origin);
                if (clientUrl.origin === self.location.origin) {
                    if ('focus' in client) {
                        client.focus();
                    }
                    if ('navigate' in client && targetUrl) {
                        return client.navigate(targetUrl);
                    }
                    return;
                }
            }
            // Se não houver janela aberta, abre uma nova diretamente no destino
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
        })
    );
});
