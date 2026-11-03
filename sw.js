// Increment this version whenever an application asset changes.
const CACHE_PREFIX = `protime:${self.registration.scope}:`;
const CACHE_NAME = `${CACHE_PREFIX}v2`;
const APP_FILES = [
    './',
    './index.html',
    './css/estilos.css',
    './js/storage.js',
    './js/incidencias.js',
    './js/app.js',
    './js/web.js',
    './js/voice.js',
    './js/mapa.js',
    './js/pwa.js',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-512.png',
    './icons/apple-touch-icon.png'
];
const APP_URLS = new Set(APP_FILES.map(path => new URL(path, self.registration.scope).href));

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(
        APP_FILES.map(path => new Request(new URL(path, self.registration.scope), { cache: 'reload' }))
    )));
    // Updates activate after existing tabs close to avoid mixing asset versions.
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map(key => caches.delete(key)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    // Cache only the app shell. External maps, data and other files keep normal behavior.
    if (event.request.method !== 'GET' || !APP_URLS.has(event.request.url)) return;
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(event.request)) || fetch(event.request);
    })());
});
