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
  const model = createProjectsPageViewModel({ projects: state.projects || [], tasks: state.tasks || [], users: state.users || [], filters: { query: ui.filters.projectSearch, statuses: ['all'], ownerIds: ['all'] }, statusLabels: ST, priorityLabels: PR, fmt, rgba });
  return <section className="panel project-grid react-projects-page"><input className="input" placeholder="Поиск проектов" value={ui.filters.projectSearch} onChange={(event) => ui.setFilter('projectSearch', event.currentTarget.value)} /><ProjectsPageView model={model} actions={actions} /></section>;
}
export default ProjectsPage;
