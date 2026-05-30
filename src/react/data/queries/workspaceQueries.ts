import { useQuery } from '@tanstack/react-query';
import type { AppUser, Project, Task } from '../../../types/entities';
import { createWorkspaceRepositorySet } from '../../../repositories';
import { requireWorkspaceSupabaseClient } from './workspaceQueryClient';
import { workspaceQueryKeys } from './workspaceQueryKeys';
import { useWorkspaceState } from '../../state/useWorkspaceStore';
import { useWorkspaceBootstrapQuery } from './workspaceBootstrapQuery';

function hasClient() {
  const state = useWorkspaceState();
  return Boolean(state?.sb && state?.profile);
}

export function useWorkspaceBootstrap() {
  return useWorkspaceBootstrapQuery();
}

export function useProjectsQuery(initialData?: Project[]) {
  const enabled = hasClient();
  return useQuery({
    queryKey: workspaceQueryKeys.projects(),
    enabled,
    initialData,
    queryFn: () => createWorkspaceRepositorySet(requireWorkspaceSupabaseClient()).projects.listRequired()
  });
}

export function useTasksQuery(initialData?: Task[]) {
  const enabled = hasClient();
  return useQuery({
    queryKey: workspaceQueryKeys.tasks(),
    enabled,
    initialData,
    queryFn: () => createWorkspaceRepositorySet(requireWorkspaceSupabaseClient()).tasks.listPaged({ page: 250, max: 5000, timeoutMs: 30000 })
  });
}

export function useUsersQuery(initialData?: AppUser[]) {
  const enabled = hasClient();
  return useQuery({
    queryKey: workspaceQueryKeys.users(),
    enabled,
    initialData,
    queryFn: () => createWorkspaceRepositorySet(requireWorkspaceSupabaseClient()).users.list()
  });
}
