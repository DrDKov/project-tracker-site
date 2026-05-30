import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { workspaceQueryKeys } from '../../react/data/queries/workspaceQueryKeys';
import type { WorkspaceRealtimeChange, WorkspaceRealtimeTable } from './realtimeEvents';

export interface RealtimeInvalidationResult {
  table: WorkspaceRealtimeTable;
  eventType: string;
  keys: QueryKey[];
}

function uniqueQueryKeys(keys: QueryKey[]): QueryKey[] {
  const seen = new Set<string>();
  const out: QueryKey[] = [];
  for (const key of keys) {
    const marker = JSON.stringify(key);
    if (seen.has(marker)) continue;
    seen.add(marker);
    out.push(key);
  }
  return out;
}

export function queryKeysForRealtimeTable(table: WorkspaceRealtimeTable, row?: Record<string, unknown> | null): QueryKey[] {
  const projectId = typeof row?.project_id === 'string' ? row.project_id : null;

  switch (table) {
    case 'projects':
      return [workspaceQueryKeys.bootstrap(), workspaceQueryKeys.projects(), workspaceQueryKeys.tasks()];
    case 'tasks':
      return [workspaceQueryKeys.bootstrap(), workspaceQueryKeys.tasks(), workspaceQueryKeys.notifications()];
    case 'app_users':
      return [workspaceQueryKeys.bootstrap(), workspaceQueryKeys.users(), workspaceQueryKeys.tasks()];
    case 'project_members':
      return [workspaceQueryKeys.bootstrap(), workspaceQueryKeys.members(), workspaceQueryKeys.projects(), workspaceQueryKeys.users()];
    case 'task_assignees':
    case 'task_subtasks':
    case 'task_comments':
      return [workspaceQueryKeys.bootstrap(), workspaceQueryKeys.tasks(), workspaceQueryKeys.notifications()];
    case 'project_messages':
      return [workspaceQueryKeys.bootstrap(), workspaceQueryKeys.chat(projectId)];
    case 'material_templates':
    case 'material_folders':
    case 'material_files':
      return [workspaceQueryKeys.bootstrap(), workspaceQueryKeys.materials()];
    default:
      return [workspaceQueryKeys.all];
  }
}

export function invalidateRealtimeChange(queryClient: QueryClient, change: WorkspaceRealtimeChange): RealtimeInvalidationResult {
  const row = change.row || change.old || null;
  const keys = uniqueQueryKeys(queryKeysForRealtimeTable(change.table, row));
  for (const queryKey of keys) {
    queryClient.invalidateQueries({ queryKey });
  }
  return { table: change.table, eventType: String(change.eventType), keys };
}

export function invalidateWorkspaceSoftSync(queryClient: QueryClient): RealtimeInvalidationResult {
  const change: WorkspaceRealtimeChange = { table: 'workspace', eventType: 'SOFT_SYNC', source: 'soft-sync' };
  const keys = [workspaceQueryKeys.all];
  queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all });
  return { table: change.table, eventType: change.eventType, keys };
}
