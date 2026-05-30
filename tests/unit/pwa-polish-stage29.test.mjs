import assert from 'node:assert/strict';
import fs from 'node:fs';

const files = {
  client: fs.readFileSync('src/shared/pwa/pwaClient.ts', 'utf8'),
  lifecycle: fs.readFileSync('src/react/pwa/PwaLifecycle.tsx', 'utf8'),
  install: fs.readFileSync('src/react/pwa/PwaInstallPrompt.tsx', 'utf8'),
  update: fs.readFileSync('src/react/pwa/PwaUpdateBanner.tsx', 'utf8'),
  offline: fs.readFileSync('src/react/pwa/PwaOfflineBanner.tsx', 'utf8'),
  sw: fs.readFileSync('public/service-worker.js', 'utf8'),
  css: fs.readFileSync('src/styles/pwa-mobile.css', 'utf8'),
  architecture: fs.readFileSync('ARCHITECTURE.md', 'utf8')
};

assert.ok(files.client.includes('listenForAppInstallPrompt'));
assert.ok(files.client.includes('requestServiceWorkerUpdate'));
assert.ok(files.client.includes('controllerchange')); 
assert.ok(files.install.includes('userChoice'));
assert.ok(files.update.includes('SKIP_WAITING') || files.lifecycle.includes('requestServiceWorkerUpdate'));
assert.ok(files.offline.includes('Нет соединения'));
assert.ok(files.sw.includes('isSupabaseRequest'));
assert.ok(files.sw.includes('networkFirstNavigation'));
assert.ok(files.sw.includes('cacheFirst'));
assert.ok(files.css.includes('is-pwa-standalone'));
assert.ok(files.css.includes('is-pwa-offline'));
assert.ok(files.architecture.includes('Stage 29'));

console.log('pwa polish Stage 29 tests passed');
