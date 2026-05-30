import React from 'react';
import { listenForAppInstallPrompt, listenForControllerChange, listenForOnlineStatus, registerWorkspaceServiceWorker, requestServiceWorkerUpdate, isStandaloneDisplayMode, type BeforeInstallPromptEvent } from '../../shared/pwa/pwaClient';
import { PwaInstallPrompt } from './PwaInstallPrompt';
import { PwaOfflineBanner } from './PwaOfflineBanner';
import { PwaUpdateBanner } from './PwaUpdateBanner';

function hasWaitingWorker(registration: ServiceWorkerRegistration | null): boolean {
  return Boolean(registration?.waiting);
}

export function PwaLifecycle() {
  const [registration, setRegistration] = React.useState<ServiceWorkerRegistration | null>(null);
  const [promptEvent, setPromptEvent] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = React.useState(false);
  const [updateDismissed, setUpdateDismissed] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [online, setOnline] = React.useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [standalone, setStandalone] = React.useState(isStandaloneDisplayMode());

  React.useEffect(() => {
    let mounted = true;
    const run = () => {
      registerWorkspaceServiceWorker().then((result) => {
        if (!mounted) return;
        setRegistration(result.registration);
        setStandalone(isStandaloneDisplayMode());
        const reg = result.registration;
        if (!reg) return;
        if (hasWaitingWorker(reg)) setUpdateDismissed(false);
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setRegistration(reg);
              setUpdateDismissed(false);
            }
          });
        });
      });
    };

    if (document.readyState === 'complete') run();
    else window.addEventListener('load', run, { once: true });

    return () => {
      mounted = false;
      window.removeEventListener('load', run);
    };
  }, []);

  React.useEffect(() => listenForAppInstallPrompt((event) => {
    setPromptEvent(event);
    setInstallDismissed(false);
  }), []);

  React.useEffect(() => listenForOnlineStatus((isOnline) => setOnline(isOnline)), []);

  React.useEffect(() => listenForControllerChange(() => {
    if (refreshing) window.location.reload();
  }), [refreshing]);

  function updateApp() {
    setRefreshing(true);
    const sent = requestServiceWorkerUpdate(registration);
    if (!sent) {
      setRefreshing(false);
      setUpdateDismissed(true);
    }
  }

  const updateVisible = hasWaitingWorker(registration) && !updateDismissed;
  const installVisible = Boolean(promptEvent) && !installDismissed && !standalone;

  if (!updateVisible && !installVisible && online) return null;

  return (
    <div className="pwa-banner-stack" aria-label="PWA состояние приложения">
      <PwaOfflineBanner online={online} />
      <PwaUpdateBanner visible={updateVisible} refreshing={refreshing} onUpdate={updateApp} onDismiss={() => setUpdateDismissed(true)} />
      <PwaInstallPrompt promptEvent={promptEvent} standalone={standalone} onDismiss={() => setInstallDismissed(true)} onInstallComplete={() => { setPromptEvent(null); setStandalone(true); }} />
    </div>
  );
}
