// sw.js — Service worker con versión explícita, precache configurable,
// y caché aparte para las teselas del mapa (para que el mapa funcione
// sin conexión en las zonas ya visitadas).
//
// REGLA: cada vez que cambies cualquier archivo listado en ASSETS,
// sube VERSION. scripts/sw-lint.py falla el commit si te olvidas.
const VERSION = 'roma-2026.08.03-11';
const CACHE_NAME = `app-cache-${VERSION}`;
const TILE_CACHE = `map-tiles-${VERSION}`;
const IMAGE_CACHE = `place-images-${VERSION}`;
const TILE_HOST_PATTERN = /tile\.openstreetmap\.org/;

// Lista de archivos a precachear. Los datos de cada viaje (data/trips/<id>/*)
// se cachean solos al visitarlos, vía la estrategia stale-while-revalidate
// de más abajo — no hace falta listarlos aquí uno a uno.
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './core/categoryColors.js',
  './core/categoryIcons.js',
  './core/sheet.js',
  './core/map.js',
  './core/maps.js',
  './core/filters.js',
  './core/audioguide.js',
  './core/install.js',
  './core/update.js',
  './core/pullToRefresh.js',
  './core/now.js',
  './core/visited.js',
  './core/search.js',
  './core/info.js',
  './core/trips.js',
  './data/trips.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS.map((a) => new Request(a, { cache: 'reload' }))).catch(() => {
        // si algún asset opcional no existe (p.ej. data/trip.json aún no creado), no bloquear la instalación
        return Promise.all(ASSETS.map((a) => cache.add(a).catch(() => {})));
      }))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME && k !== TILE_CACHE && k !== IMAGE_CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;

  // Teselas del mapa: cache-first, se guardan según se van pidiendo
  // (así "offline" cubre las zonas por las que ya has navegado el mapa).
  if (TILE_HOST_PATTERN.test(url)) {
    event.respondWith(
      caches.open(TILE_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            cache.put(event.request, response.clone());
            return response;
          }).catch(() => cached);
        })
      )
    );
    return;
  }

  // Fotos reales de lugares (data/lugares.json -> campo "imagen"): cache-first
  // igual que las teselas, para que también funcionen offline.
  if (event.request.destination === 'image' && !TILE_HOST_PATTERN.test(url)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            cache.put(event.request, response.clone());
            return response;
          }).catch(() => cached);
        })
      )
    );
    return;
  }

  // Resto de assets: stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'GET_VERSION') {
    event.source.postMessage({ type: 'VERSION', version: VERSION });
  }
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
