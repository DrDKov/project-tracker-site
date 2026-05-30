import { useWorkspaceState } from '../../state/useWorkspaceStore';
import { useProjectsQuery, useTasksQuery, useUsersQuery } from './workspaceQueries';
import { useWorkspaceBootstrapQuery } from './workspaceBootstrapQuery';

export function useWorkspaceServerState() {
  const state = useWorkspaceState();
  const bootstrapQuery = useWorkspaceBootstrapQuery();
  const bootstrap = bootstrapQuery.data;
  const projectsQuery = useProjectsQuery(bootstrap?.projects || state.projects || []);
  const tasksQuery = useTasksQuery(bootstrap?.tasks || state.tasks || []);
  const usersQuery = useUsersQuery(bootstrap?.users || state.users || []);

  return {
    projects: projectsQuery.data || bootstrap?.projects || state.projects || [],
    tasks: tasksQuery.data || bootstrap?.tasks || state.tasks || [],
    users: usersQuery.data || bootstrap?.users || state.users || [],
    members: bootstrap?.members || state.members || [],
    assignees: bootstrap?.assignees || state.assignees || [],
    subtasks: bootstrap?.subtasks || state.subtasks || [],
    taskComments: bootstrap?.taskComments || state.taskComments || [],
    messages: bootstrap?.messages || state.messages || [],
    logs: bootstrap?.logs || state.logs || [],
    queries: {
      bootstrap: bootstrapQuery,
      projects: projectsQuery,
      tasks: tasksQuery,
      users: usersQuery
    },
    loading: bootstrapQuery.isLoading || projectsQuery.isLoading || tasksQuery.isLoading || usersQuery.isLoading,
    error: bootstrapQuery.error || projectsQuery.error || tasksQuery.error || usersQuery.error || null
  };
}
