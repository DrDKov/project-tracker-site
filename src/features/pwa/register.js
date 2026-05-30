// @ts-check

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker
    .register('./service-worker.js', { scope: './' })
    .catch((error) => {
      console.warn('[pwa] service worker registration failed', error);
    });
}

if (document.readyState === 'complete') {
  registerServiceWorker();
} else {
  window.addEventListener('load', registerServiceWorker, { once: true });
}
