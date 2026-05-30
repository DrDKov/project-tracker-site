// @ts-check

function ensureMeta(name, content) {
  let node = document.querySelector(`meta[name="${name}"]`);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute('name', name);
    document.head.appendChild(node);
  }
  node.setAttribute('content', content);
}

function ensureLink(rel, href, type = '') {
  let node = document.querySelector(`link[rel="${rel}"]`);
  if (!node) {
    node = document.createElement('link');
    node.setAttribute('rel', rel);
    document.head.appendChild(node);
  }
  node.setAttribute('href', href);
  if (type) node.setAttribute('type', type);
}

function ensurePwaHead() {
  ensureLink('manifest', './manifest.webmanifest');
  ensureLink('apple-touch-icon', './assets/icons/icon-192.png');
  ensureMeta('theme-color', '#2563eb');
  ensureMeta('apple-mobile-web-app-capable', 'yes');
  ensureMeta('apple-mobile-web-app-status-bar-style', 'default');
  ensureMeta('apple-mobile-web-app-title', 'Project Tracker');
}

function registerServiceWorker() {
  ensurePwaHead();

  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker
    .register('./service-worker.js', { scope: './' })
    .catch((error) => {
      console.warn('[pwa] service worker registration failed', error);
    });
}

ensurePwaHead();

if (document.readyState === 'complete') {
  registerServiceWorker();
} else {
  window.addEventListener('load', registerServiceWorker, { once: true });
}
