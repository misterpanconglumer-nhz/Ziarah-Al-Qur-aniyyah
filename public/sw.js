// Service Worker for Ziarah Akbar Al-Qur'aniyyah 2027 PWA
const CACHE_NAME = 'ziarah-2027-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon.ico',
  '/brand/logo-main.svg',
  '/brand/logo-main-dark.svg',
  '/brand/logo-symbol.svg',
  '/brand/logo-symbol-dark.svg',
  '/brand/app-icon-192.png',
  '/brand/app-icon-512.png',
  '/brand/app-icon-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache error:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Hanya tangani GET requests
  if (event.request.method !== 'GET') return;

  // Lewati supabase API calls agar data selalu realtime & aman
  const url = new URL(event.request.url);
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Cache static assets dynamically
        if (
          response &&
          response.status === 200 &&
          response.type === 'basic' &&
          (url.pathname.endsWith('.js') ||
            url.pathname.endsWith('.css') ||
            url.pathname.endsWith('.svg') ||
            url.pathname.endsWith('.png') ||
            url.pathname.endsWith('.woff2'))
        ) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      });
    })
  );
});
