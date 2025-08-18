// Simplified Service Worker for cache management
const CACHE_NAME = 'parent-activity-cache-v' + Date.now();

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Clear all storage when activating new version
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'CLEAR_STORAGE' });
        });
      });
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Simple fetch handler - let browser handle caching based on headers
self.addEventListener('fetch', (event) => {
  // Let the browser handle all requests normally
  return;
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});