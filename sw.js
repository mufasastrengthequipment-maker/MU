// ══════════════════════════════════════════
//  MUFASA STRENGTH — Service Worker v2
// ══════════════════════════════════════════

const CACHE_NAME = 'mufasa-v3';

// Core files to cache on install (app shell)
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/mufasa-header-logo.png',
  '/hero-bg.png',
  // Google Fonts — cached at runtime on first load
];

// ── Install: pre-cache the app shell ──────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE).catch(err => {
        console.warn('[SW] Pre-cache failed for some files:', err);
      });
    })
  );
  // Activate immediately without waiting for old SW to die
  self.skipWaiting();
});

// ── Activate: delete old caches ───────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// ── Fetch: network-first for API/Firebase,
//           cache-first for static assets ──
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Always go network-first for:
  // Firebase, Google APIs, WhatsApp, external resources
  const networkFirst = [
    'firebaseio.com',
    'firebaseapp.com',
    'googleapis.com',
    'gstatic.com',
    'wa.me',
    'youtube.com',
    'soundcloud.com',
    'spotify.com',
  ];

  if (networkFirst.some(domain => url.hostname.includes(domain))) {
    event.respondWith(
      fetch(request).catch(() => {
        // If network fails for Firebase etc., just fail silently
        return new Response('', { status: 503 });
      })
    );
    return;
  }

  // For navigation requests (HTML pages) — network first, cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache the fresh HTML
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          // Offline fallback — serve cached index.html
          return caches.match('/index.html');
        })
    );
    return;
  }

  // For static assets (images, fonts, CSS, JS) — cache first, network fallback
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        // Only cache successful responses for same-origin or fonts
        if (
          response.ok &&
          (url.origin === self.location.origin ||
            url.hostname.includes('fonts.g'))
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        // For images, return a transparent 1px placeholder
        if (request.destination === 'image') {
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
      });
    })
  );
});

// ── Background sync: notify clients of updates ──
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
