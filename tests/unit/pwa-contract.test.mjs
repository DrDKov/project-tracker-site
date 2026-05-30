import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(ROOT, file));

const manifest = JSON.parse(read('public/manifest.webmanifest'));
const sw = read('public/service-worker.js');
const pwaClient = read('src/shared/pwa/pwaClient.ts');
const pwaLifecycle = read('src/react/pwa/PwaLifecycle.tsx');
const pwaCss = read('src/styles/pwa-mobile.css');
const mainCss = read('src/styles/main.css');
const app = read('src/app/App.tsx');

assert.equal(manifest.display, 'standalone');
assert.equal(manifest.start_url, './?source=pwa');
assert.equal(manifest.scope, './');
assert.equal(manifest.theme_color, '#2563eb');
assert.ok(manifest.display_override.includes('standalone'));
assert.ok(manifest.shortcuts.some((shortcut) => shortcut.url.includes('#/tasks')));
assert.ok(manifest.icons.some((icon) => icon.src === './assets/icons/maskable-512.png' && String(icon.purpose || '').includes('maskable')));

assert.ok(exists('public/offline.html'));
assert.ok(sw.includes('pt-pwa-${CACHE_VERSION}') || sw.includes('pt-pwa-'));
assert.ok(sw.includes('CACHE_VERSION'));
assert.ok(sw.includes('/assets/build/'));
assert.ok(sw.includes('./offline.html'));
assert.ok(sw.includes('SKIP_WAITING'));
assert.ok(sw.includes('/auth/v1/') && sw.includes('/realtime/v1/') && sw.includes('/storage/v1/'));
assert.equal(sw.includes('S.tasks'), false, 'service worker must not touch app state');

assert.ok(pwaClient.includes("navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: SERVICE_WORKER_SCOPE })"));
assert.ok(pwaClient.includes('beforeinstallprompt'));
assert.ok(pwaClient.includes('isStandaloneDisplayMode'));
assert.ok(pwaLifecycle.includes('PwaInstallPrompt'));
assert.ok(pwaLifecycle.includes('PwaUpdateBanner'));
assert.ok(pwaLifecycle.includes('PwaOfflineBanner'));
assert.ok(app.includes('PwaLifecycle'));
assert.ok(pwaCss.includes('safe-area-inset-bottom'));
assert.ok(pwaCss.includes('.pwa-banner-stack'));
assert.ok(mainCss.includes("@import './pwa-mobile.css';"));

console.log('pwa contract tests passed');
