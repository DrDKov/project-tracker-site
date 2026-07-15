const APP_URL = 'https://drdkov.github.io/project-tracker-site/index.html#tasks';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}
  const title = data.title || 'Р’Р°Рј РЅР°Р·РЅР°С‡РµРЅР° РЅРѕРІР°СЏ Р·Р°РґР°С‡Р°';
  const options = {
    body: data.body || 'РћС‚РєСЂРѕР№С‚Рµ Project Tracker, С‡С‚РѕР±С‹ РїРѕСЃРјРѕС‚СЂРµС‚СЊ РїРѕРґСЂРѕР±РЅРѕСЃС‚Рё.',
    icon: data.icon || './assets/icon-192.png',
    badge: data.badge || './favicon-32.png',
    tag: 'project-tracker-assignment',
    renotify: true,
    data: { url: data.url || APP_URL },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data?.url || APP_URL;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        if ('navigate' in client) await client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});