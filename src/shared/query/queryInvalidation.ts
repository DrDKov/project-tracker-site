import type { QueryClient } from '@tanstack/react-query';
import { workspaceQueryKeys } from '../../react/data/queries/workspaceQueryKeys';

export function invalidateWorkspaceQueries(queryClient: QueryClient, reason = 'workspace-change') {
  queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all });
  return reason;
}

export function invalidateTaskQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.tasks() });
}

export function invalidateProjectQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.projects() });
}

export function invalidateMaterialQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.materials() });
}

export function invalidateWorkspaceBootstrapQuery(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.bootstrap() });
}
