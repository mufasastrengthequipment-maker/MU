/**
 * MUFASA STRENGTH EQUIPMENT - Service Worker
 * Standalone PWA Service Worker for offline support, caching, and background sync
 */

const CACHE_NAME = 'mufasa-v1';
const ASSETS_CACHE = 'mufasa-assets-v1';
const API_CACHE = 'mufasa-api-v1';

// Critical assets to cache on install
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/sw.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Barlow:wght@300;400;500;600&display=swap'
];

// Image assets to cache (local images referenced in HTML)
const IMAGE_ASSETS = [
  '/mufasa-header-logo.png',
  '/hero-bg.png',
  '/shop-hero-bg.png',
  '/b580ce7684acdf3f50585a63262be7b6.jpg',
  '/FB_IMG_17764489238779449.jpg',
  '/343490bc1f30e07fafa24787db7cc40e.jpg'
];

/**
 * INSTALL: Cache critical assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching critical assets');
        return cache.addAll(CRITICAL_ASSETS);
      })
      .then(() => {
        // Cache images in separate cache
        return caches.open(ASSETS_CACHE).then((cache) => {
          return Promise.all(
            IMAGE_ASSETS.map((url) =>
              cache.add(url).catch((err) => {
                console.warn(`[SW] Failed to cache ${url}:`, err);
              })
            )
          );
        });
      })
      .then(() => {
        console.log('[SW] Install complete');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Install failed:', err);
      })
  );
});

/**
 * ACTIVATE: Clean up old caches and claim clients
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== ASSETS_CACHE && cacheName !== API_CACHE) {
              console.log(`[SW] Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim();
      })
  );
});

/**
 * FETCH: Network-first strategy for dynamic content, cache-first for assets
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extensions and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API calls: Network-first, fallback to cache
  if (url.pathname.includes('/api/') || url.hostname !== self.location.hostname) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Images and fonts: Cache-first
  if (request.destination === 'image' || request.destination === 'font') {
    event.respondWith(cacheFirst(request, ASSETS_CACHE));
    return;
  }

  // HTML & JS: Network-first, fallback to cache
  if (request.destination === 'document' || request.destination === 'script' || request.destination === 'style') {
    event.respondWith(networkFirst(request, CACHE_NAME));
    return;
  }

  // Default: Network-first
  event.respondWith(networkFirst(request, CACHE_NAME));
});

/**
 * Cache-first strategy: Return from cache, fallback to network
 */
function cacheFirst(request, cacheName) {
  return caches.match(request)
    .then((cached) => {
      if (cached) {
        console.log(`[SW] Cache hit: ${request.url}`);
        return cached;
      }
      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          const responseClone = response.clone();
          caches.open(cacheName).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          console.warn(`[SW] Offline and no cache: ${request.url}`);
          return new Response('Offline - Resource not available', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
    });
}

/**
 * Network-first strategy: Try network, fallback to cache
 */
function networkFirst(request, cacheName) {
  return fetch(request)
    .then((response) => {
      if (!response || response.status !== 200 || response.type === 'error') {
        return response;
      }
      const responseClone = response.clone();
      caches.open(cacheName).then((cache) => {
        cache.put(request, responseClone);
      });
      return response;
    })
    .catch(() => {
      console.log(`[SW] Network failed, trying cache: ${request.url}`);
      return caches.match(request)
        .then((cached) => {
          if (cached) {
            return cached;
          }
          // Fallback for offline pages
          if (request.destination === 'document') {
            return caches.match('/index.html');
          }
          return new Response('Offline - Resource not available', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
    });
}

/**
 * MESSAGE: Handle messages from client (index.html)
 */
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  if (type === 'CLEAR_CACHE') {
    clearAllCaches();
  }

  if (type === 'CACHE_ASSETS') {
    cacheAssets(data.urls);
  }

  if (type === 'GET_CACHE_SIZE') {
    getCacheSize().then((size) => {
      event.ports[0].postMessage({ cacheSize: size });
    });
  }
});

/**
 * Clear all caches (called from admin panel)
 */
function clearAllCaches() {
  caches.keys().then((cacheNames) => {
    Promise.all(
      cacheNames.map((cacheName) => {
        console.log(`[SW] Clearing cache: ${cacheName}`);
        return caches.delete(cacheName);
      })
    );
  });
}

/**
 * Dynamically cache additional assets
 */
function cacheAssets(urls) {
  caches.open(ASSETS_CACHE).then((cache) => {
    urls.forEach((url) => {
      cache.add(url).catch((err) => {
        console.warn(`[SW] Failed to cache ${url}:`, err);
      });
    });
  });
}

/**
 * Get total cache size (for admin info)
 */
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }

  return totalSize;
}

/**
 * Background Sync: Queue offline actions (e.g., cart submissions)
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-cart') {
    event.waitUntil(syncCart());
  }

  if (event.tag === 'sync-progress') {
    event.waitUntil(syncProgress());
  }
});

async function syncCart() {
  try {
    const cartData = await getCacheData('cart-queue');
    if (cartData) {
      // Send to WhatsApp or API
      console.log('[SW] Syncing cart data:', cartData);
      await clearCacheData('cart-queue');
    }
  } catch (err) {
    console.error('[SW] Cart sync failed:', err);
  }
}

async function syncProgress() {
  try {
    const progressData = await getCacheData('progress-queue');
    if (progressData) {
      console.log('[SW] Syncing progress data:', progressData);
      await clearCacheData('progress-queue');
    }
  } catch (err) {
    console.error('[SW] Progress sync failed:', err);
  }
}

/**
 * IndexedDB helpers for queue management
 */
function getCacheData(key) {
  return new Promise((resolve) => {
    const req = indexedDB.open('MufasaDB', 1);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('queue', 'readonly');
      const store = tx.objectStore('queue');
      const get = store.get(key);
      get.onsuccess = () => resolve(get.result);
    };
  });
}

function clearCacheData(key) {
  return new Promise((resolve) => {
    const req = indexedDB.open('MufasaDB', 1);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('queue', 'readwrite');
      const store = tx.objectStore('queue');
      store.delete(key);
      tx.oncomplete = () => resolve();
    };
  });
}

console.log('[SW] Service Worker loaded and ready');
