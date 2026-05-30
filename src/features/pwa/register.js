// @ts-check

import { registerWorkspaceServiceWorker, applyPwaDocumentState, listenForOnlineStatus } from '../../shared/pwa/pwaClient';

function registerOnLoad() {
  registerWorkspaceServiceWorker();
}

applyPwaDocumentState();
listenForOnlineStatus(() => applyPwaDocumentState());

if (document.readyState === 'complete') {
  registerOnLoad();
} else {
  window.addEventListener('load', registerOnLoad, { once: true });
}
