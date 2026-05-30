// @ts-nocheck
import { createDashboardOverviewModel } from '../../react/dashboard/dashboardModel.ts';
import { mountDashboardOverview } from '../../react/dashboard/mountDashboardOverview.tsx';
import { createWorkspaceReactActions } from '../../react/actions/workspaceActions.ts';

/** @typedef {import('../../types/entities.js').AppState} AppState */

/**
 * Stage 25 shell facade. React owns AppShell chrome and dashboard overview
 * cards; this adapter only coordinates metrics and active page rendering while
 * runtime-compatibility bridge is still active.
 * @param {{
 *   S: AppState,
 *   $: (id: string) => any,
 *   qa: (selector: string) => Element[],
 *   today: () => string,
 *   selectsMaybe: () => void,
 *   admin: () => boolean,
 *   owner: () => boolean,
 *   renderProjects: () => void,
 *   renderTasks: () => void,
 *   renderTeam: () => void,
 *   renderAudit: () => void,
 *   renderTimeline: () => void,
 *   renderChat: () => void,
 *   renderAccess: () => void,
 *   taskCardModel: (task: import('../../types/entities.js').Task, options?: {showStatus?: boolean}) => Record<string, any>,
 *   fmt: (value?: string | null) => string,
 *   rgba: (hex: string | undefined | null, alpha: number) => string,
 *   ST: Record<string, string>,
 *   PR: Record<string, string>
 * }} deps
 */
export function createAppShellRenderer(deps) {
  const { S, $, qa, today, selectsMaybe, admin, owner, renderProjects, renderTasks, renderTeam, renderAudit, renderTimeline, renderChat, renderAccess, taskCardModel, fmt, rgba, ST, PR } = deps;
  const actions = createWorkspaceReactActions();

  function renderMetrics() {
    if ($('mProjects')) $('mProjects').textContent = String(S.projects.length);
    if ($('mOpen')) $('mOpen').textContent = String(S.tasks.filter((task) => task.status !== 'done').length);
    if ($('mOverdue')) $('mOverdue').textContent = String(S.tasks.filter((task) => task.status !== 'done' && task.due_date && task.due_date < today()).length);
    if ($('mUsers')) $('mUsers').textContent = String(S.users.length);
  }

  function renderDashboardOverview() {
    const projectsContainer = $('overviewProjects');
    const tasksContainer = $('focusList');
    if (!projectsContainer && !tasksContainer) return;
    const model = createDashboardOverviewModel({ projects: S.projects, tasks: S.tasks, users: S.users, statusLabels: ST, priorityLabels: PR, fmt, rgba, taskCard: taskCardModel });
    mountDashboardOverview({
      projectsContainer,
      tasksContainer,
      model,
      actions: {
        projectActions: { openProject: actions.openProject, createTaskForProject: (projectId) => actions.openTask(undefined, projectId), openAccess: actions.openAccess, deleteProject: actions.deleteProject },
        taskActions: { openTask: (taskId) => actions.openTask(taskId), deleteTask: actions.deleteTask, toggleTask: actions.toggleTask, toggleTaskFavorite: actions.toggleTaskFavorite, addSubtask: actions.addSubtask, toggleSubtask: actions.toggleSubtask, deleteSubtask: actions.deleteSubtask }
      }
    });
  }

  function render() {
    selectsMaybe();
    qa('.admin-only').forEach((node) => node.classList.toggle('hidden', !admin()));
    const auditButton = /** @type {HTMLElement | null} */ (document.querySelector('.nav [data-view="audit"]'));
    if (auditButton) auditButton.style.display = owner() ? '' : 'none';
    renderMetrics();
    renderDashboardOverview();
    if (S.view === 'projects') renderProjects();
    if (S.view === 'tasks') renderTasks();
    if (S.view === 'team') renderTeam();
    if (S.view === 'audit') renderAudit();
    if (S.view === 'timeline') renderTimeline();
    if (S.view === 'chat') renderChat();
    renderAccess();
  }

  return { render };
}
