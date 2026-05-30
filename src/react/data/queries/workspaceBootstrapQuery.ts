import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AppState,
  AppUser,
  Project,
  ProjectMember,
  ProjectMessage,
  Subtask,
  Task,
  TaskAssignee,
  TaskComment,
  WorkspacePermissionSnapshot
} from '../../../types/entities';
import type { SupabaseClientLike } from '../../../types/supabase';
import { createWorkspaceRepositorySet } from '../../../repositories';
import { workspaceQueryKeys } from './workspaceQueryKeys';
import { requireWorkspaceSupabaseClient } from './workspaceQueryClient';
import { useWorkspaceState } from '../../state/useWorkspaceStore';
import { getWorkspaceStore } from '../../state/workspaceStoreAdapter.ts';
import { getWorkspacePermissionSnapshot } from '../../../core/permissions/index.js';

export interface WorkspaceBootstrapData {
  projects: Project[];
  tasks: Task[];
  users: AppUser[];
  members: ProjectMember[];
  assignees: TaskAssignee[];
  subtasks: Subtask[];
  taskComments: TaskComment[];
  messages: ProjectMessage[];
  logs: Array<Record<string, unknown>>;
  warnings: string[];
}

export interface WorkspaceBootstrapOptions {
  owner?: boolean;
  warnings?: string[];
  taskPage?: number;
  taskMax?: number;
  taskTimeoutMs?: number;
  onTaskProgress?: (count: number) => void;
}

function activeRows<T extends { deleted_at?: string | null }>(rows: T[] | null | undefined): T[] {
  return Array.isArray(rows) ? rows.filter((item) => !item?.deleted_at) : [];
}

export async function loadWorkspaceTasksQueryData(
  client: SupabaseClientLike,
  options: Pick<WorkspaceBootstrapOptions, 'taskPage' | 'taskMax' | 'taskTimeoutMs' | 'onTaskProgress'> = {}
): Promise<Task[]> {
  const repositories = createWorkspaceRepositorySet(client);
  const rows = await repositories.tasks.listPaged({
    page: options.taskPage ?? 250,
    max: options.taskMax ?? 5000,
    timeoutMs: options.taskTimeoutMs ?? 30000,
    onProgress: options.onTaskProgress
  });
  return activeRows(rows);
}

export async function loadWorkspaceBootstrapData(
  client: SupabaseClientLike,
  options: WorkspaceBootstrapOptions = {}
): Promise<WorkspaceBootstrapData> {
  const warnings = options.warnings || [];
  const repositories = createWorkspaceRepositorySet(client);
  const [projects, tasks, reference, logs] = await Promise.all([
    repositories.projects.listRequired(12000),
    loadWorkspaceTasksQueryData(client, options),
    repositories.workspace.referenceData(warnings),
    options.owner ? repositories.workspace.activityLog(warnings) : Promise.resolve([] as Array<Record<string, unknown>>)
  ]);

  return {
    projects: activeRows(projects),
    tasks,
    users: Array.isArray(reference.users) ? reference.users : [],
    members: Array.isArray(reference.members) ? reference.members : [],
    assignees: Array.isArray(reference.assignees) ? reference.assignees : [],
    subtasks: activeRows(reference.subtasks),
    taskComments: activeRows(reference.taskComments),
    messages: Array.isArray(reference.messages) ? reference.messages : [],
    logs: Array.isArray(logs) ? logs : [],
    warnings: [...warnings]
  };
}

export function createWorkspaceBootstrapStatePatch(
  data: WorkspaceBootstrapData,
  profile?: AppUser | null,
  permissions?: WorkspacePermissionSnapshot | null
): Partial<AppState> {
  const permissionSnapshot = permissions || getWorkspacePermissionSnapshot(profile || null, data.projects, data.members);
  return {
    projects: data.projects,
    tasks: data.tasks,
    users: data.users,
    members: data.members,
    assignees: data.assignees,
    subtasks: data.subtasks,
    taskComments: data.taskComments,
    messages: data.messages,
    logs: data.logs,
    permissions: permissionSnapshot,
    warnings: data.warnings
  };
}

export function syncWorkspaceBootstrapToStore(data: WorkspaceBootstrapData, state?: AppState | null): Partial<AppState> {
  const store = getWorkspaceStore();
  const currentState = state || (typeof store?.getState === 'function' ? store.getState() : null);
  const patch = createWorkspaceBootstrapStatePatch(data, currentState?.profile || null, currentState?.permissions || null);
  if (store && typeof store.setState === 'function') {
    store.setState(patch, { source: 'query-bootstrap', stage: '26C' });
  }
  return patch;
}

export function useWorkspaceBootstrapQuery() {
  const state = useWorkspaceState();
  const clientReady = Boolean(state?.sb && state?.profile);
  const owner = state?.profile?.role === 'owner';
  const query = useQuery({
    queryKey: workspaceQueryKeys.bootstrap(),
    enabled: clientReady,
    initialData: clientReady && (state.projects?.length || state.tasks?.length || state.users?.length)
      ? {
          projects: state.projects || [],
          tasks: state.tasks || [],
          users: state.users || [],
          members: state.members || [],
          assignees: state.assignees || [],
          subtasks: state.subtasks || [],
          taskComments: state.taskComments || [],
          messages: state.messages || [],
          logs: state.logs || [],
          warnings: state.warnings || []
        }
      : undefined,
    queryFn: () => loadWorkspaceBootstrapData(requireWorkspaceSupabaseClient(), { owner, warnings: [...(state.warnings || [])] })
  });

  React.useEffect(() => {
    if (query.data && clientReady) syncWorkspaceBootstrapToStore(query.data, state);
  }, [query.data, clientReady]);

  return query;
}

export function useWorkspaceBootstrapQuerySync() {
  const queryClient = useQueryClient();
  const query = useWorkspaceBootstrapQuery();

  React.useEffect(() => {
    const data = query.data;
    if (!data) return;
    queryClient.setQueryData(workspaceQueryKeys.projects(), data.projects);
    queryClient.setQueryData(workspaceQueryKeys.tasks(), data.tasks);
    queryClient.setQueryData(workspaceQueryKeys.users(), data.users);
    queryClient.setQueryData(workspaceQueryKeys.members(), data.members);
    queryClient.setQueryData(workspaceQueryKeys.chat(), data.messages);
  }, [queryClient, query.data]);

  return query;
}
