import React from 'react';
import { ReactAppProviders } from '../react/app/ReactAppProviders';
import { AppSidebar, AppTopbar } from '../react/app-shell/AppShell';
import { createAppShellModel } from '../react/app-shell/appShellModel';
import { useWorkspaceRoute } from './router/useWorkspaceRoute';
import { useWorkspaceState } from '../react/state/useWorkspaceStore';
import { installWorkspaceStore, restoreWorkspaceSession, invalidateWorkspaceData } from './workspaceRuntime';
import { getWorkspacePermissionSnapshot } from '../core/permissions/index.js';
import { createWorkspaceReactActions } from '../react/actions/workspaceActions';
import { EmptyState } from '../shared/ui';
import { PwaLifecycle } from '../react/pwa';
import { AppErrorBoundary, LazyRouteFallback, PERFORMANCE_BUDGETS, markWorkspacePerformance, measureWorkspacePerformance, scheduleIdleTask } from '../shared/production';
import {
  LazyAuditPage,
  LazyChatPage,
  LazyDashboardPage,
  LazyMaterialsPage,
  LazyProjectsPage,
  LazySettingsPage,
  LazyTasksPage,
  LazyTeamPage,
  LazyTimelinePage
} from './lazyPages';

function WorkspaceBoot() {
  React.useEffect(() => {
    markWorkspacePerformance('workspace:boot:start');
    installWorkspaceStore();
    window.__PT_APP_BOOTSTRAPPED__ = true;
    window.__PT_LOADED_MODULES__ = ['pwa', 'react-root'];
    restoreWorkspaceSession().finally(() => {
      markWorkspacePerformance('workspace:boot:end');
      measureWorkspacePerformance('workspace:boot', 'workspace:boot:start', 'workspace:boot:end', PERFORMANCE_BUDGETS.appBootMs);
    });
  }, []);
  return null;
}

function RoutePerformanceMarker({ routeId }: { routeId: string }) {
  React.useEffect(() => {
    const start = `workspace:route:${routeId}:start`;
    const end = `workspace:route:${routeId}:end`;
    markWorkspacePerformance(start);
    scheduleIdleTask(() => measureWorkspacePerformance(`workspace:route:${routeId}`, start, end, PERFORMANCE_BUDGETS.routeRenderMs), 1500);
  }, [routeId]);
  return null;
}

function MainPage() {
  const state = useWorkspaceState();
  const route = useWorkspaceRoute();
  const permissions = getWorkspacePermissionSnapshot(state.profile || null, state.projects || [], state.members || []);
  const actions = React.useMemo(() => createWorkspaceReactActions(), [state.sb, state.profile?.id]);
  const shell = createAppShellModel({
    state,
    view: route.routeId,
    permissions,
    statusTitle: state.statusTitle,
    statusText: state.statusText,
    hasMaterialsSection: true
  });

  const selectView = React.useCallback((view: string) => route.navigateToView(view), [route]);

  function renderPage() {
    switch (route.routeId) {
      case 'overview': return <LazyDashboardPage />;
      case 'tasks': return <LazyTasksPage />;
      case 'projects': return <LazyProjectsPage />;
      case 'materials': return <LazyMaterialsPage />;
      case 'team': return <LazyTeamPage />;
      case 'timeline': return <LazyTimelinePage />;
      case 'chat': return <LazyChatPage />;
      case 'audit': return <LazyAuditPage />;
      case 'settings': return <LazySettingsPage />;
      default: return <EmptyState title="Страница не найдена" />;
    }
  }

  return (
    <div className="app react-pure-app" data-stage="30">
      <RoutePerformanceMarker routeId={route.routeId} />
      <aside className="sidebar react-shell-sidebar">
        <AppSidebar model={shell} onSelectView={selectView} />
      </aside>
      <main className="main react-shell-main">
        <header className="topbar react-shell-topbar">
          <AppTopbar
            model={shell}
            onRefresh={() => invalidateWorkspaceData()}
            onOpenSettings={() => route.navigateToView('settings')}
            onCreateProject={() => actions.openProject?.()}
            onCreateTask={() => actions.openTask?.()}
          />
        </header>
        <section className="react-page-panel" data-route={route.routeId}>
          <React.Suspense fallback={<LazyRouteFallback title="Загрузка раздела" />}>
            {renderPage()}
          </React.Suspense>
        </section>
      </main>
    </div>
  );
}

export function App() {
  return (
    <AppErrorBoundary>
      <ReactAppProviders>
        <WorkspaceBoot />
        <MainPage />
        <PwaLifecycle />
      </ReactAppProviders>
    </AppErrorBoundary>
  );
}
