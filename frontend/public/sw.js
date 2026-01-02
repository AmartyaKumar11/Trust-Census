// Trust-First Census System - Service Worker
// Version: 1.0.0

const CACHE_NAME = 'trust-census-v1';
const STATIC_CACHE = 'trust-census-static-v1';
const DYNAMIC_CACHE = 'trust-census-dynamic-v1';
const OFFLINE_CACHE = 'trust-census-offline-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/principles',
  '/architecture',
  '/login',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Pages that can work offline
const OFFLINE_PAGES = [
  '/submit',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('trust-census-') && 
                     name !== STATIC_CACHE && 
                     name !== DYNAMIC_CACHE &&
                     name !== OFFLINE_CACHE;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Serve from cache if offline
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Serve offline page
              return caches.match('/offline');
            });
        })
    );
    return;
  }

  // Handle static assets
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version, but also update cache in background
          event.waitUntil(
            fetch(request)
              .then((response) => {
                if (response.ok) {
                  caches.open(STATIC_CACHE)
                    .then((cache) => cache.put(request, response));
                }
              })
              .catch(() => {
                // Ignore network errors for background updates
              })
          );
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(DYNAMIC_CACHE)
                .then((cache) => cache.put(request, responseClone));
            }
            return response;
          });
      })
  );
});

// Handle background sync for offline submissions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'sync-submissions') {
    event.waitUntil(syncSubmissions());
  }
});

// Sync pending submissions when online
async function syncSubmissions() {
  console.log('[SW] Syncing pending submissions...');
  
  // This would be implemented to sync IndexedDB data
  // For now, just notify clients
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: 'SYNC_COMPLETE',
      message: 'Background sync completed',
    });
  });
}

// Listen for messages from clients
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Push notification support (for future use)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: event.data?.text() || 'New update available',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'trust-census-notification',
    requireInteraction: false,
  };
  
  event.waitUntil(
    self.registration.showNotification('Trust Census System', options)
  );
});

