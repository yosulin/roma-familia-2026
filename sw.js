// sw.js — Service worker genérico con cache-busting por versión.
//
// REGLA: cada vez que cambies cualquier archivo listado en ASSETS,
// sube VERSION. scripts/sw-lint.py falla el commit si te olvidas.
const VERSION = 'roma-2026.08.03-1';
const CACHE_NAME = `app-cache-${VERSION}`;

// Lista de archivos a precachear. Personaliza por proyecto.
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './core/categoryColors.js',
  './core/sheet.js',
  './core/map.js',
  './core/maps.js',
  './core/filters.js',
  './core/audioguide.js',
  './core/install.js',
  './core/update.js',
  './core/pullToRefresh.js',
  './data/lugares.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => cached);
      // stale-while-revalidate: sirve caché al instante, actualiza en segundo plano
      return cached || network;
    })
  );
});

// Permite que app.js pida "¿hay versión nueva?" sin recargar a ciegas
self.addEventListener('message', (event) => {
  if (event.data === 'GET_VERSION') {
    event.source.postMessage({ type: 'VERSION', version: VERSION });
  }
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
