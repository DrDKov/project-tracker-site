// @ts-nocheck

/** @typedef {import('../../types/entities.js').AppState} AppState */
import { createProjectsPageViewModel } from '../../react/projects/projectModel.ts';
import { mountProjectsPage } from '../../react/projects/mountProjectsPage.tsx';
import { createWorkspaceReactActions } from '../../react/actions/workspaceActions.ts';

/**
 * Stage 25 projects facade. React owns project page/card rendering; this adapter
 * only reads legacy filters and mounts the React page until runtime-compatibility bridge is gone.
 * @param {{
 *   S: AppState,
 *   $: (id: string) => any,
 *   fmt: (value?: string | null) => string,
 *   rgba: (hex: string | undefined | null, alpha: number) => string,
 *   vals: (id: string) => string[],
 *   ST: Record<string, string>,
 *   PR: Record<string, string>
 * }} deps
 */
export function createProjectRenderer(deps) {
  const { S, $, fmt, rgba, vals, ST, PR } = deps;
  const reactActions = createWorkspaceReactActions();

  function currentFilters() {
    return {
      query: ($('projectSearch')?.value || '').toLowerCase(),
      statuses: vals('projectStatusFilter'),
      ownerIds: vals('projectOwnerFilter')
    };
  }

  function renderProjects() {
    const grid = $('projectGrid');
    if (!grid) return;
    const model = createProjectsPageViewModel({
      projects: S.projects,
      tasks: S.tasks,
      users: S.users,
      filters: currentFilters(),
      statusLabels: ST,
      priorityLabels: PR,
      fmt,
      rgba
    });
    mountProjectsPage(grid, model, {
      openProject: reactActions.openProject,
      createTaskForProject: (projectId) => reactActions.openTask(undefined, projectId),
      openAccess: reactActions.openAccess,
      deleteProject: reactActions.deleteProject
    });
  }

  return { renderProjects };
}
