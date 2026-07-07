const CACHE_NAME = 'price-tracker-v5';
const urlsToCache = [
    './',
    './index.html',
    './css/style.css',
    './js/db.js',
    './js/app.js',
    './manifest.json',
    './offline.html'
];

const CDN_CACHE = 'price-tracker-cdn-v1';
const cdnUrls = [
    'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        Promise.all([
            caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)),
            caches.open(CDN_CACHE).then(cache => {
                return Promise.allSettled(
                    cdnUrls.map(url => cache.add(url).catch(() => {}))
                );
            })
        ])
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames =>
            Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME && name !== CDN_CACHE)
                    .map(name => caches.delete(name))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const requestUrl = event.request.url;

    if (cdnUrls.some(url => requestUrl.startsWith(url))) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                const fetchPromise = fetch(event.request).then(response => {
                    return caches.open(CDN_CACHE).then(cache => {
                        cache.put(event.request, response.clone());
                        return response;
                    });
                });
                return cached || fetchPromise;
            })
        );
        return;
    }

    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match('./offline.html'))
        );
        return;
    }

    event.respondWith(
        fetch(event.request).then(response => {
            if (response && response.status === 200) {
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
            }
            return response;
        }).catch(() => caches.match(event.request))
    );
});
