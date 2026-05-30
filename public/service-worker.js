const CACHE_VERSION = 'v29';
const CACHE_NAME = `pt-pwa-${CACHE_VERSION}`;
const APP_SHELL_URLS = [
  './',
  './index.html',
  './offline.html',
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

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isBuildAsset(url) {
  return isSameOrigin(url) && url.pathname.includes('/assets/build/');
}

function isAppShellUrl(url) {
  return APP_SHELL_URLS.some((path) => new URL(path, self.location.href).href === url.href);
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) await cache.put(request, response.clone());
  return response;
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) await cache.put('./index.html', response.clone());
    return response;
  } catch (error) {
    return (await cache.match('./index.html')) || (await cache.match('./offline.html')) || Response.error();
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_URLS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME && key.startsWith('pt-pwa-')).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!isSameOrigin(url) || isSupabaseRequest(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isBuildAsset(url) || isAppShellUrl(url)) {
    event.respondWith(cacheFirst(request));
  }
});
