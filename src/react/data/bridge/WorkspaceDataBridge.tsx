import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkspaceState } from '../../state/useWorkspaceStore';
import { workspaceQueryKeys } from '../queries/workspaceQueryKeys';
import { useWorkspaceBootstrapQuerySync } from '../queries/workspaceBootstrapQuery';

function activeRows<T extends { deleted_at?: string | null }>(rows: T[] | undefined) {
  return Array.isArray(rows) ? rows.filter((item) => !item?.deleted_at) : [];
}

function seedQueryIfMissing<T>(queryClient: ReturnType<typeof useQueryClient>, queryKey: readonly unknown[], value: T[] | undefined) {
  if (!Array.isArray(value) || !value.length) return;
  const existing = queryClient.getQueryData(queryKey);
  if (existing === undefined) queryClient.setQueryData(queryKey, value);
}

function seedActiveQueryIfMissing<T extends { deleted_at?: string | null }>(queryClient: ReturnType<typeof useQueryClient>, queryKey: readonly unknown[], value: T[] | undefined) {
  const rows = activeRows(value);
  seedQueryIfMissing(queryClient, queryKey, rows);
}

export function WorkspaceDataBridge() {
  const queryClient = useQueryClient();
  const state = useWorkspaceState();
  useWorkspaceBootstrapQuerySync();

  React.useEffect(() => {
    seedActiveQueryIfMissing(queryClient, workspaceQueryKeys.projects(), state.projects || []);
    seedActiveQueryIfMissing(queryClient, workspaceQueryKeys.tasks(), state.tasks || []);
    seedQueryIfMissing(queryClient, workspaceQueryKeys.users(), state.users || []);
    seedQueryIfMissing(queryClient, workspaceQueryKeys.members(), state.members || []);
    seedActiveQueryIfMissing(queryClient, workspaceQueryKeys.chat(), state.messages || []);
  }, [queryClient, state.projects, state.tasks, state.users, state.members, state.messages]);

  return null;
}
