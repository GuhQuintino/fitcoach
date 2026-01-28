const CACHE_NAME = 'fitcoach-v6'; // Incremented to force update (2024-01-10)
const ASSETS_TO_CACHE = [
    '/',
    '/manifest.json',
    '/icon.svg'
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

    // NEVER cache API calls
    if (isApiCall) {
        return; // Let browser handle normally
    }

    // Network First for navigation requests
    if (event.request.mode === 'navigate' || (isSelfOrigin && (url.pathname === '/' || url.pathname === '/index.html'))) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clonedResponse = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clonedResponse);
                    });
                    return response;
                })
                .catch(() => {
                    // Fallback to cached index.html, ignoring search params (key for PWA installability)
                    return caches.match('/index.html', { ignoreSearch: true }).then(response => {
                        return response || caches.match('/', { ignoreSearch: true });
                    });
                })
        );
        return;
    }

    // Stale While Revalidate for static assets ONLY from same origin
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
