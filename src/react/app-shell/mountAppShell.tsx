// @ts-nocheck
import React from 'react';
import { renderReactIsland } from '../core/createReactIsland.tsx';
import { AppSidebar, AppTopbar } from './AppShell.tsx';
import { createAppShellModel } from './appShellModel.ts';
import { WorkspaceStoreProvider } from '../state/WorkspaceStoreProvider';
import { useWorkspaceActions, useWorkspaceState } from '../state/useWorkspaceStore';
import { useWorkspaceRoute } from '../../app/router/useWorkspaceRoute';

function getApp() {
  return null;
}

function useAppShellModel() {
  const state = useWorkspaceState();
  const route = useWorkspaceRoute();
  const app = getApp();
  const today = typeof app?.today === 'function' ? app.today() : new Date().toISOString().slice(0, 10);
  return createAppShellModel({
    state,
    view: route.routeId || app?.view || state?.view || 'overview',
    permissions: app?.permissions || state?.permissions || {},
    today,
    hasMaterialsSection: Boolean(document.getElementById('materials')),
    statusTitle: state?.statusTitle || 'База подключена',
    statusText: state?.statusText || 'Проверяю текущую сессию...'
  });
}

function useAppShellActions() {
  const actions = useWorkspaceActions();
  const route = useWorkspaceRoute();
  return React.useMemo(() => ({
    onSelectView(view) { route.navigateToView(view); },
    onRefresh() { actions.load(); },
    onOpenSettings() { route.navigateToView('settings'); },
    onCreateProject() { actions.openProject(); },
    onCreateTask() { actions.openTask(); }
  }), [actions, route]);
}

function SidebarRoot() {
  const model = useAppShellModel();
  const actions = useAppShellActions();
  return (
    <WorkspaceStoreProvider>
      <AppSidebar model={model} onSelectView={actions.onSelectView} />
    </WorkspaceStoreProvider>
  );
}

function TopbarRoot() {
  const model = useAppShellModel();
  const actions = useAppShellActions();
  return (
    <WorkspaceStoreProvider>
      <AppTopbar model={model} {...actions} />
    </WorkspaceStoreProvider>
  );
}

function syncAppShell() {
  const sidebar = document.querySelector('.sidebar');
  const topbar = document.querySelector('.topbar');
  if (!(sidebar instanceof HTMLElement) || !(topbar instanceof HTMLElement)) return;
  sidebar.classList.add('react-app-shell-sidebar');
  topbar.classList.add('react-app-shell-topbar');
  renderReactIsland(sidebar, <SidebarRoot />);
  renderReactIsland(topbar, <TopbarRoot />);
}

export function mountAppShell() {
  if (window.__REACT_APP_SHELL_STAGE12__) return;
  window.__REACT_APP_SHELL_STAGE12__ = true;
  syncAppShell();
  window.addEventListener('react-app-shell:sync', () => syncAppShell());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAppShell);
else mountAppShell();
