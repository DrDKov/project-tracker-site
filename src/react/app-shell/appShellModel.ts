// @ts-nocheck

/** @typedef {import('../../types/entities.js').AppState} AppState */
import { WORKSPACE_ROUTES, getWorkspaceRouteById } from '../../app/router/workspaceRoutes';

export const APP_SHELL_PAGES = WORKSPACE_ROUTES;

/**
 * @param {unknown[]} value
 */
function safeLength(value) {
  return Array.isArray(value) ? value.length : 0;
}

/**
 * @param {AppState | undefined | null} state
 * @param {string} today
 */
export function createAppShellMetrics(state, today) {
  const projects = Array.isArray(state?.projects) ? state.projects : [];
  const tasks = Array.isArray(state?.tasks) ? state.tasks : [];
  const users = Array.isArray(state?.users) ? state.users : [];
  const openTasks = tasks.filter((task) => task.status !== 'done').length;
  const overdueTasks = tasks.filter((task) => task.status !== 'done' && task.due_date && task.due_date < today).length;

  return {
    projects: projects.length,
    openTasks,
    overdueTasks,
    users: users.length
  };
}

/**
 * @param {{ canViewAudit?: boolean, canViewMaterials?: boolean } | undefined | null} permissions
 * @param {{ hasMaterialsSection?: boolean }} [options]
 */
export function createVisibleAppPages(permissions, options = {}) {
  return APP_SHELL_PAGES.filter((page) => {
    if (page.requires === 'audit') return Boolean(permissions?.canViewAudit);
    if (page.requires === 'materials') return Boolean(permissions?.canViewMaterials && options.hasMaterialsSection);
    return true;
  });
}

/**
 * @param {string | undefined | null} view
 */
export function getAppShellPage(view) {
  return getWorkspaceRouteById(view);
}

/**
 * @param {{
 *   state?: AppState | null,
 *   view?: string | null,
 *   permissions?: { canViewAudit?: boolean, canViewMaterials?: boolean } | null,
 *   today?: string,
 *   statusTitle?: string,
 *   statusText?: string,
 *   hasMaterialsSection?: boolean
 * }} input
 */
export function createAppShellModel(input = {}) {
  const state = input.state || {};
  const view = input.view || state.view || 'overview';
  const activePage = getAppShellPage(view);
  const pages = createVisibleAppPages(input.permissions || {}, { hasMaterialsSection: Boolean(input.hasMaterialsSection) });
  const visibleView = pages.some((page) => page.id === view) ? view : 'overview';
  const visibleActivePage = getAppShellPage(visibleView);

  return {
    view: visibleView,
    brand: {
      logo: 'PT',
      title: 'Workspace',
      subtitle: 'Общие проекты и задачи'
    },
    pages,
    title: visibleActivePage.label || activePage.label,
    subtitle: visibleActivePage.subtitle || activePage.subtitle,
    statusTitle: input.statusTitle || 'База подключена',
    statusText: input.statusText || 'Проверяю текущую сессию...',
    metrics: createAppShellMetrics(state, input.today || new Date().toISOString().slice(0, 10)),
    actions: {
      canCreateProject: true,
      canCreateTask: true,
      canRefresh: true,
      canOpenSettings: true
    }
  };
}
