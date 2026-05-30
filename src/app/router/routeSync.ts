import { getWorkspaceRouteHash, routeIdFromHash, type WorkspaceRouteId } from './workspaceRoutes';
import { useWorkspaceUiStore } from '../../shared/store/uiStore';

export interface WorkspaceRouteSyncOptions { replace?: boolean; applyRuntime?: boolean; }

let installed = false;

function setHash(hash: string, replace = false) {
  if (typeof window === 'undefined') return;
  if (window.location.hash === hash) return;
  if (replace) window.history.replaceState(window.history.state, '', hash);
  else window.location.hash = hash;
}

export function navigateWorkspaceRoute(view: string, options: WorkspaceRouteSyncOptions = {}) {
  const targetHash = getWorkspaceRouteHash(view);
  useWorkspaceUiStore.getState().setActiveView(routeIdFromHash(targetHash));
  setHash(targetHash, Boolean(options.replace));
}

export function applyWorkspaceRouteToRuntime(view: WorkspaceRouteId = routeIdFromHash(typeof window !== 'undefined' ? window.location.hash : '')) {
  useWorkspaceUiStore.getState().setActiveView(view);
}

export function installWorkspaceRouteSync() {
  if (typeof window === 'undefined' || installed) return;
  installed = true;
  if (!window.location.hash) setHash(getWorkspaceRouteHash(useWorkspaceUiStore.getState().activeView || 'overview'), true);
  window.addEventListener('hashchange', () => applyWorkspaceRouteToRuntime());
  requestAnimationFrame(() => applyWorkspaceRouteToRuntime());
}
