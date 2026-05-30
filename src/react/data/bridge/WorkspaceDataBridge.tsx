import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkspaceState } from '../../state/useWorkspaceStore';
import { workspaceQueryKeys } from '../queries/workspaceQueryKeys';
import { useWorkspaceBootstrapQuerySync } from '../queries/workspaceBootstrapQuery';

function seedQueryIfMissing<T>(queryClient: ReturnType<typeof useQueryClient>, queryKey: readonly unknown[], value: T[] | undefined) {
  if (!Array.isArray(value) || !value.length) return;
  const existing = queryClient.getQueryData(queryKey);
  if (existing === undefined) queryClient.setQueryData(queryKey, value);
}

export function WorkspaceDataBridge() {
  const queryClient = useQueryClient();
  const state = useWorkspaceState();
  useWorkspaceBootstrapQuerySync();

  React.useEffect(() => {
    seedQueryIfMissing(queryClient, workspaceQueryKeys.projects(), state.projects || []);
    seedQueryIfMissing(queryClient, workspaceQueryKeys.tasks(), state.tasks || []);
    seedQueryIfMissing(queryClient, workspaceQueryKeys.users(), state.users || []);
    seedQueryIfMissing(queryClient, workspaceQueryKeys.members(), state.members || []);
    seedQueryIfMissing(queryClient, workspaceQueryKeys.chat(), state.messages || []);
  }, [queryClient, state.projects, state.tasks, state.users, state.members, state.messages]);

  return null;
}
