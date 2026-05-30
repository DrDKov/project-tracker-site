export interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export interface PwaRegistrationResult {
  supported: boolean;
  registration: ServiceWorkerRegistration | null;
  error?: unknown;
}

export const SERVICE_WORKER_URL = './service-worker.js';
export const SERVICE_WORKER_SCOPE = './';
export const PWA_MODULE_NAME = 'pwa';

export function isPwaSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === 'undefined') return false;
  const standaloneMedia = window.matchMedia?.('(display-mode: standalone)').matches;
  const navigatorStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return Boolean(standaloneMedia || navigatorStandalone);
}

export function markPwaModuleLoaded(): void {
  window.__PT_LOADED_MODULES__ = Array.from(new Set([...(window.__PT_LOADED_MODULES__ || []), PWA_MODULE_NAME]));
}

export function applyPwaDocumentState(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('is-pwa-standalone', isStandaloneDisplayMode());
  document.documentElement.classList.toggle('is-pwa-offline', typeof navigator !== 'undefined' && !navigator.onLine);
}

export async function registerWorkspaceServiceWorker(): Promise<PwaRegistrationResult> {
  markPwaModuleLoaded();
  applyPwaDocumentState();

  if (!isPwaSupported()) return { supported: false, registration: null };

  try {
    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: SERVICE_WORKER_SCOPE });
    return { supported: true, registration };
  } catch (error) {
    console.warn('[pwa] service worker registration failed', error);
    return { supported: true, registration: null, error };
  }
}

export function requestServiceWorkerUpdate(registration: ServiceWorkerRegistration | null | undefined): boolean {
  const waiting = registration?.waiting;
  if (!waiting) return false;
  waiting.postMessage({ type: 'SKIP_WAITING' });
  return true;
}

export function listenForControllerChange(onChange: () => void): () => void {
  if (!isPwaSupported()) return () => {};
  navigator.serviceWorker.addEventListener('controllerchange', onChange);
  return () => navigator.serviceWorker.removeEventListener('controllerchange', onChange);
}

export function listenForAppInstallPrompt(onPrompt: (event: BeforeInstallPromptEvent) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => {
    event.preventDefault();
    onPrompt(event as BeforeInstallPromptEvent);
  };
  window.addEventListener('beforeinstallprompt', handler);
  return () => window.removeEventListener('beforeinstallprompt', handler);
}

export function listenForOnlineStatus(onChange: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const update = () => {
    applyPwaDocumentState();
    onChange(navigator.onLine);
  };
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  return () => {
    window.removeEventListener('online', update);
    window.removeEventListener('offline', update);
  };
}
