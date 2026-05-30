export type WorkspaceRealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE' | 'SOFT_SYNC' | string;

export type WorkspaceRealtimeTable =
  | 'projects'
  | 'tasks'
  | 'app_users'
  | 'project_members'
  | 'task_assignees'
  | 'task_subtasks'
  | 'task_comments'
  | 'project_messages'
  | 'material_templates'
  | 'material_folders'
  | 'material_files'
  | string;

export interface WorkspaceRealtimeChange {
  table: WorkspaceRealtimeTable;
  eventType: WorkspaceRealtimeEventType;
  row?: Record<string, unknown> | null;
  old?: Record<string, unknown> | null;
  source?: 'supabase' | 'soft-sync' | 'manual';
  at?: number;
}

export const WORKSPACE_REALTIME_EVENT = 'workspace:realtime-change';

export function createWorkspaceRealtimeChange(change: WorkspaceRealtimeChange): WorkspaceRealtimeChange {
  return {
    source: 'supabase',
    at: Date.now(),
    ...change
  };
}

export function dispatchWorkspaceRealtimeChange(change: WorkspaceRealtimeChange): WorkspaceRealtimeChange {
  const detail = createWorkspaceRealtimeChange(change);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<WorkspaceRealtimeChange>(WORKSPACE_REALTIME_EVENT, { detail }));
  }
  return detail;
}

export function subscribeWorkspaceRealtimeChanges(listener: (change: WorkspaceRealtimeChange) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => {
    listener((event as CustomEvent<WorkspaceRealtimeChange>).detail);
  };
  window.addEventListener(WORKSPACE_REALTIME_EVENT, handler);
  return () => window.removeEventListener(WORKSPACE_REALTIME_EVENT, handler);
}
