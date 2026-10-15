const CACHE_NAME = 'fitcoach-v10';
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

    // Navigation requests: Network First with fallback to cached /index.html
    if (event.request.mode === 'navigate' || (isSelfOrigin && (url.pathname === '/' || url.pathname === '/index.html'))) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const clonedResponse = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, clonedResponse);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match('/index.html').then((response) => {
                        return response || caches.match('/');
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
