// @ts-nocheck
import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { dispatchWorkspaceRealtimeChange } from './realtimeEvents';
import { useWorkspaceState } from '../../react/state/useWorkspaceStore';
import { workspaceQueryKeys } from '../../react/data/queries/workspaceQueryKeys';
import { appStore } from '../../core/state/store';

const REALTIME_TABLES = [
  'projects',
  'tasks',
  'task_assignees',
  'task_subtasks',
  'task_comments',
  'project_messages',
  'workspace_templates',
  'material_folders',
  'material_files',
  'project_members',
  'app_users'
];

const TABLE_TO_STATE_KEY = {
  projects: 'projects',
  tasks: 'tasks',
  task_assignees: 'assignees',
  task_subtasks: 'subtasks',
  task_comments: 'taskComments',
  project_messages: 'messages',
  workspace_templates: 'materialTemplates',
  material_folders: 'materialFolders',
  material_files: 'materialFiles',
  project_members: 'members',
  app_users: 'users'
};

const QUERY_KEY_BY_TABLE = {
  projects: workspaceQueryKeys.projects(),
  tasks: workspaceQueryKeys.tasks(),
  task_assignees: workspaceQueryKeys.tasks(),
  task_subtasks: workspaceQueryKeys.tasks(),
  task_comments: workspaceQueryKeys.tasks(),
  project_messages: workspaceQueryKeys.chat(),
  workspace_templates: workspaceQueryKeys.materials(),
  material_folders: workspaceQueryKeys.materials(),
  material_files: workspaceQueryKeys.materials(),
  project_members: workspaceQueryKeys.members(),
  app_users: workspaceQueryKeys.users()
};

function rowId(row) { return row && row.id ? String(row.id) : ''; }
function isSoftDeleted(row) { return Boolean(row && row.deleted_at); }
function upsertById(items, row) {
  const id = rowId(row);
  if (!id) return items || [];
  let found = false;
  const next = (items || []).map((item) => {
    if (rowId(item) === id) { found = true; return { ...item, ...row }; }
    return item;
  });
  if (!found) next.push(row);
  return next;
}
function removeById(items, row) {
  const id = rowId(row);
  if (!id) return items || [];
  return (items || []).filter((item) => rowId(item) !== id);
}
function updateRows(items, eventType, row, old) {
  const target = row || old;
  if (!target) return items || [];
  if (eventType === 'DELETE' || isSoftDeleted(row)) return removeById(items || [], target);
  return upsertById(items || [], row);
}
function applyRealtimePayload(table, change) {
  const key = TABLE_TO_STATE_KEY[table];
  if (!key) return;
  const eventType = String(change.eventType || '').toUpperCase();
  const row = change.row || null;
  const old = change.old || null;
  const current = (appStore.getState() || {})[key] || [];
  const next = updateRows(current, eventType, row, old);
  appStore.setState({ [key]: next }, { source: `realtime:${table}`, stage: 'react-realtime-local' });
}
function patchBootstrapCache(previous, table, change) {
  if (!previous) return previous;
  const key = TABLE_TO_STATE_KEY[table];
  if (!key || !Array.isArray(previous[key])) return previous;
  const eventType = String(change.eventType || '').toUpperCase();
  const nextRows = updateRows(previous[key], eventType, change.row || null, change.old || null);
  return { ...previous, [key]: nextRows };
}

export function useWorkspaceRealtimeInvalidation() {
  const queryClient = useQueryClient();
  const state = useWorkspaceState();
  const client = state?.sb;
  const profileId = state?.profile?.id;

  React.useEffect(() => {
    if (!client || !profileId || typeof client.channel !== 'function') return undefined;
    const channel = client.channel(`workspace-react-realtime:${profileId}:${Date.now()}`);
    REALTIME_TABLES.forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        const change = {
          table,
          eventType: payload.eventType || payload.type || 'UPDATE',
          row: payload.new || null,
          old: payload.old || null,
          source: 'supabase'
        };
        window.__workspaceRealtimeLastEvent = { table, eventType: change.eventType, at: new Date().toISOString(), rowId: rowId(change.row || change.old) };
        applyRealtimePayload(table, change);
        queryClient.setQueryData(workspaceQueryKeys.bootstrap(), (previous) => patchBootstrapCache(previous, table, change));
        const tableQueryKey = QUERY_KEY_BY_TABLE[table];
        if (tableQueryKey) {
          queryClient.setQueryData(tableQueryKey, (previous) => Array.isArray(previous) ? updateRows(previous, String(change.eventType || '').toUpperCase(), change.row || null, change.old || null) : previous);
        }
        dispatchWorkspaceRealtimeChange(change);
      });
    });
    channel.subscribe((status) => {
      window.__workspaceRealtimeStatus = status;
      if (status === 'SUBSCRIBED') console.info('[workspace-realtime] subscribed');
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') console.warn('[workspace-realtime] status', status);
    });
    return () => {
      if (typeof client.removeChannel === 'function') client.removeChannel(channel);
      else if (typeof channel.unsubscribe === 'function') channel.unsubscribe();
    };
  }, [client, profileId, queryClient]);
}
