const CACHE_NAME = 'pt-pwa-v1';
const APP_SHELL_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/maskable-512.png'
];

function isSupabaseRequest(url) {
  return /\.supabase\.co$/i.test(url.hostname)
    || url.pathname.includes('/auth/v1/')
    || url.pathname.includes('/realtime/v1/')
    || url.pathname.includes('/storage/v1/')
    || url.pathname.includes('/rest/v1/')
    || url.pathname.includes('/functions/v1/');
}

function isBuildAsset(url) {
  return url.origin === self.location.origin && url.pathname.includes('/assets/build/');
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put('./index.html', response.clone());
    return response;
  } catch (error) {
    return (await cache.match('./index.html')) || Response.error();
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME && key.startsWith('pt-pwa-')).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isSupabaseRequest(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isBuildAsset(url) || APP_SHELL_URLS.some((path) => new URL(path, self.location.href).href === url.href)) {
    event.respondWith(cacheFirst(request));
  }
});
