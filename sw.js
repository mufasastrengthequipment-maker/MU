// ══════════════════════════════════════════
//  MUFASA STRENGTH — Service Worker v3
// ══════════════════════════════════════════

const CACHE_NAME = 'mufasa-v3';
const CACHE_VERSION = 3;

// Core files to cache on install (app shell)
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/mufasa-header-logo.png',
  '/hero-bg.png',
  '/343490bc1f30e07fafa24787db7cc40e.jpg',
  '/b580ce7684acdf3f50585a63262be7b6.jpg',
  '/FB_IMG_17764489238779449.jpg',
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
          .filter(key => key !== CACHE_NAME && key.startsWith('mufasa-'))
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
    'firebase.google.com',
    'googleapis.com',
    'gstatic.com',
    'wa.me',
    'youtube.com',
    'soundcloud.com',
    'spotify.com',
    'facebook.com',
  ];

  if (networkFirst.some(domain => url.hostname.includes(domain))) {
    event.respondWith(
      fetch(request).catch(() => {
        // If network fails for Firebase etc., fail gracefully
        return new Response(
          JSON.stringify({ error: 'Service unavailable' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // For navigation requests (HTML pages) — network first, cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Only cache successful responses
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback — serve cached index.html
          return caches.match('/index.html') || 
            new Response('Offline — please check your connection', { status: 503 });
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
        // For images, return a transparent 1px SVG placeholder
        if (request.destination === 'image') {
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect fill="%23222" width="1" height="1"/></svg>',
            { 
              status: 200,
              headers: { 'Content-Type': 'image/svg+xml' } 
            }
          );
        }
        
        // For other requests, return an offline response
        return new Response('Resource unavailable offline', { status: 503 });
      });
    })
  );
});

// ── Message handler: client-to-service-worker communication ──
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0].postMessage({ cleared: true });
    });
  }
});

// ── Background sync: future feature for offline queueing ──
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  try {
    console.log('[SW] Background sync triggered');
    // Future: implement data sync when connection restored
  } catch (err) {
    console.error('[SW] Sync failed:', err);
  }
}
