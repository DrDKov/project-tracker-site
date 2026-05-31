// @ts-nocheck
import React from 'react';
import { ReactAppProviders } from '../react/app/ReactAppProviders';
import { AppSidebar, AppTopbar } from '../react/app-shell/AppShell';
import { createAppShellModel } from '../react/app-shell/appShellModel';
import { useWorkspaceRoute } from './router/useWorkspaceRoute';
import { useWorkspaceState } from '../react/state/useWorkspaceStore';
import { useWorkspaceUiStore } from '../shared/store/uiStore';
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

function RoutePerformanceMarker({ routeId }) {
  React.useEffect(() => {
    const start = `workspace:route:${routeId}:start`;
    const end = `workspace:route:${routeId}:end`;
    markWorkspacePerformance(start);
    scheduleIdleTask(() => measureWorkspacePerformance(`workspace:route:${routeId}`, start, end, PERFORMANCE_BUDGETS.routeRenderMs), 1500);
  }, [routeId]);
  return null;
}

function TaskModal({ state, actions, onClose }) {
  const ui = useWorkspaceUiStore();
  const id = ui.modals.taskId;
  const draft = ui.modals.taskDraft || {};
  const task = id ? (state.tasks || []).find((item) => item.id === id) : null;
  const source = task || draft || {};
  const selectedUsers = new Set((state.assignees || []).filter((item) => item.task_id === id).map((item) => String(item.user_id || '')).filter(Boolean));
  if (task?.assignee_id) selectedUsers.add(String(task.assignee_id));
  const selectedUserValues = Array.from(selectedUsers);

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const assigneeIds = data.getAll('assigneeIds').map(String).filter(Boolean);
    await actions.saveTaskData?.(id || null, {
      title: String(data.get('title') || '').trim(),
      project_id: String(data.get('project_id') || ''),
      status: String(data.get('status') || 'planned'),
      priority: String(data.get('priority') || 'medium'),
      start_date: String(data.get('start_date') || '') || null,
      due_date: String(data.get('due_date') || '') || null,
      notes: String(data.get('notes') || ''),
      assignee_id: assigneeIds[0] || null,
      assigneeIds
    });
    onClose();
  }

  return (
    <div className="modal-backdrop active react-modal-backdrop">
      <form className="modal card task-modal react-task-modal" onSubmit={submit}>
        <div className="modal-head"><div><h3>{id ? 'Редактировать задачу' : 'Новая задача'}</h3><p>{task?.title || 'Заполните параметры задачи'}</p></div><button type="button" className="btn ghost" onClick={onClose}>×</button></div>
        <div className="form-grid">
          <label>Название<input className="input" name="title" defaultValue={source.title || ''} required /></label>
          <label>Проект<select className="input" name="project_id" defaultValue={source.project_id || ''} required><option value="">Выберите проект</option>{(state.projects || []).map((project) => <option key={project.id} value={project.id}>{project.name || 'Без названия'}</option>)}</select></label>
          <label>Статус<select className="input" name="status" defaultValue={source.status || 'planned'}><option value="planned">Запланировано</option><option value="in_progress">В работе</option><option value="waiting">Ожидание</option><option value="done">Завершено</option><option value="blocked">Заблокировано</option></select></label>
          <label>Приоритет<select className="input" name="priority" defaultValue={source.priority || 'medium'}><option value="high">Высокий</option><option value="medium">Средний</option><option value="low">Низкий</option></select></label>
          <label>Начало<input className="input" type="date" name="start_date" defaultValue={String(source.start_date || '').slice(0, 10)} /></label>
          <label>Срок<input className="input" type="date" name="due_date" defaultValue={String(source.due_date || '').slice(0, 10)} /></label>
          <label className="wide">Исполнители<select className="input" name="assigneeIds" multiple defaultValue={selectedUserValues}>{(state.users || []).map((user) => <option key={user.id} value={user.id}>{user.display_name || user.email || 'Без имени'}</option>)}</select></label>
          <label className="wide">Описание<textarea className="input" name="notes" defaultValue={source.notes || source.description || ''} rows={5} /></label>
        </div>
        <div className="modal-actions"><button type="button" className="btn secondary" onClick={onClose}>Отмена</button><button className="btn primary" type="submit">Сохранить</button></div>
      </form>
    </div>
  );
}

function ProjectModal({ state, actions, onClose }) {
  const ui = useWorkspaceUiStore();
  const id = ui.modals.projectId === '__new__' ? null : ui.modals.projectId;
  const project = id ? (state.projects || []).find((item) => item.id === id) : null;
  async function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await actions.saveProjectData?.(id || null, {
      name: String(data.get('name') || '').trim(),
      description: String(data.get('description') || ''),
      owner_id: String(data.get('owner_id') || '') || null,
      status: String(data.get('status') || 'planned'),
      priority: String(data.get('priority') || 'medium'),
      start_date: String(data.get('start_date') || '') || null,
      deadline: String(data.get('deadline') || '') || null,
      next_step: String(data.get('next_step') || ''),
      color: String(data.get('color') || '#64748b')
    });
    onClose();
  }
  return (
    <div className="modal-backdrop active react-modal-backdrop">
      <form className="modal card project-modal react-project-modal" onSubmit={submit}>
        <div className="modal-head"><div><h3>{id ? 'Редактировать проект' : 'Новый проект'}</h3><p>{project?.name || 'Заполните параметры проекта'}</p></div><button type="button" className="btn ghost" onClick={onClose}>×</button></div>
        <div className="form-grid">
          <label>Название<input className="input" name="name" defaultValue={project?.name || ''} required /></label>
          <label>Владелец<select className="input" name="owner_id" defaultValue={project?.owner_id || state.profile?.id || ''}><option value="">Не указан</option>{(state.users || []).map((user) => <option key={user.id} value={user.id}>{user.display_name || user.email || 'Без имени'}</option>)}</select></label>
          <label>Статус<select className="input" name="status" defaultValue={project?.status || 'planned'}><option value="planned">Запланировано</option><option value="in_progress">В работе</option><option value="waiting">Ожидание</option><option value="done">Завершено</option><option value="blocked">Заблокировано</option></select></label>
          <label>Приоритет<select className="input" name="priority" defaultValue={project?.priority || 'medium'}><option value="high">Высокий</option><option value="medium">Средний</option><option value="low">Низкий</option></select></label>
          <label>Начало<input className="input" type="date" name="start_date" defaultValue={String(project?.start_date || '').slice(0, 10)} /></label>
          <label>Дедлайн<input className="input" type="date" name="deadline" defaultValue={String(project?.deadline || '').slice(0, 10)} /></label>
          <label>Цвет<input className="input" type="color" name="color" defaultValue={project?.color || '#64748b'} /></label>
          <label className="wide">Следующий шаг<input className="input" name="next_step" defaultValue={project?.next_step || ''} /></label>
          <label className="wide">Описание<textarea className="input" name="description" defaultValue={project?.description || ''} rows={4} /></label>
        </div>
        <div className="modal-actions"><button type="button" className="btn secondary" onClick={onClose}>Отмена</button><button className="btn primary" type="submit">Сохранить</button></div>
      </form>
    </div>
  );
}

function NotificationPanel({ state, actions, onClose }) {
  const items = state.notifications || [];
  return (
    <div className="modal-backdrop active react-modal-backdrop">
      <div className="modal card notification-modal">
        <div className="modal-head"><div><h3>Оповещения</h3><p>{items.length ? `Всего: ${items.length}` : 'Новых оповещений нет'}</p></div><button type="button" className="btn ghost" onClick={onClose}>×</button></div>
        <div className="notification-list">
          {items.length ? items.map((item) => <button key={item.id} type="button" className="notification-row" onClick={() => { if (item.task_id) actions.openTask?.(item.task_id); onClose(); }}><b>{item.title || 'Оповещение'}</b><span>{item.body || item.created_at || ''}</span></button>) : <div className="empty">Оповещений пока нет.</div>}
        </div>
      </div>
    </div>
  );
}

function WorkspaceModals({ state, actions, notificationsOpen, onCloseNotifications }) {
  const ui = useWorkspaceUiStore();
  const close = () => ui.closeModals();
  return (
    <>
      {(ui.modals.taskId !== null || ui.modals.taskDraft !== null) ? <TaskModal state={state} actions={actions} onClose={close} /> : null}
      {ui.modals.projectId !== null ? <ProjectModal state={state} actions={actions} onClose={close} /> : null}
      {notificationsOpen ? <NotificationPanel state={state} actions={actions} onClose={onCloseNotifications} /> : null}
    </>
  );
}

function MainPage() {
  const state = useWorkspaceState();
  const route = useWorkspaceRoute();
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
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

  const selectView = React.useCallback((view) => route.navigateToView(view), [route]);

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
            onOpenNotifications={() => setNotificationsOpen(true)}
          />
        </header>
        <section className="react-page-panel" data-route={route.routeId}>
          <React.Suspense fallback={<LazyRouteFallback title="Загрузка раздела" />}>
            {renderPage()}
          </React.Suspense>
        </section>
      </main>
      <WorkspaceModals state={state} actions={actions} notificationsOpen={notificationsOpen} onCloseNotifications={() => setNotificationsOpen(false)} />
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
