// Cleanup service worker.
// The app is a static Supabase client; no fetch interception is used, which avoids stale-cache freezes.
self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (key) { return key.indexOf('pt-pwa-') === 0; }).map(function (key) { return caches.delete(key); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});
