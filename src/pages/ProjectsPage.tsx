// @ts-nocheck
import React from 'react';
import { useWorkspaceState } from '../react/state/useWorkspaceStore';
import { useWorkspaceUiStore } from '../shared/store/uiStore';
import { createWorkspaceReactActions } from '../react/actions/workspaceActions';
import { createProjectsPageViewModel } from '../react/projects/projectModel';
import { ProjectsPage as ProjectsPageView } from '../react/projects/ProjectsPage';
import { PR, ST, fmt, rgba } from './pageUtils';

export function ProjectsPage() {
  const state = useWorkspaceState();
  const ui = useWorkspaceUiStore();
  const actions = React.useMemo(() => createWorkspaceReactActions(), [state.sb, state.profile?.id]);
  const filters = ui.filters;
  const model = createProjectsPageViewModel({
    projects: state.projects || [],
    tasks: state.tasks || [],
    users: state.users || [],
    filters: { query: filters.projectSearch, statuses: [filters.projectStatus || 'all'], ownerIds: [filters.projectOwnerId || 'all'] },
    statusLabels: ST,
    priorityLabels: PR,
    fmt,
    rgba
  });
  return (
    <section className="panel project-grid react-projects-page">
      <div className="panel-head">
        <h3>Проекты</h3>
      </div>
      <div className="project-filterbar react-filterbar">
        <input className="input" placeholder="Поиск проектов" value={filters.projectSearch} onChange={(event) => ui.setFilter('projectSearch', event.currentTarget.value)} />
        <select className="input" value={filters.projectStatus} onChange={(event) => ui.setFilter('projectStatus', event.currentTarget.value)}>
          <option value="all">Все статусы</option>
          {Object.entries(ST).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <select className="input" value={filters.projectOwnerId} onChange={(event) => ui.setFilter('projectOwnerId', event.currentTarget.value)}>
          <option value="all">Все владельцы</option>
          {(state.users || []).map((user) => <option key={user.id} value={user.id}>{user.display_name || user.email || 'Без имени'}</option>)}
        </select>
      </div>
      <ProjectsPageView model={model} actions={actions} />
    </section>
  );
}
export default ProjectsPage;
