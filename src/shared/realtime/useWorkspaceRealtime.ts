// @ts-nocheck
import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeWorkspaceRealtimeChanges, dispatchWorkspaceRealtimeChange } from './realtimeEvents';
import { invalidateRealtimeChange } from './realtimeInvalidation';
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
function applyRealtimePayload(table, payload) {
  const key = TABLE_TO_STATE_KEY[table];
  if (!key) return;
  const eventType = String(payload.eventType || payload.type || '').toUpperCase();
  const row = payload.new || payload.row || null;
  const old = payload.old || null;
  const target = row || old;
  if (!target) return;
  const state = appStore.getState() || {};
  const current = state[key] || [];
  let next;
  if (eventType === 'DELETE' || isSoftDeleted(row)) next = removeById(current, target);
  else next = upsertById(current, row);
  appStore.setState({ [key]: next }, { source: `realtime:${table}`, stage: 'react-realtime-local' });
}

export function useWorkspaceRealtimeInvalidation() {
  const queryClient = useQueryClient();
  const state = useWorkspaceState();
  const client = state?.sb;
  const profileId = state?.profile?.id;

  React.useEffect(() => {
    return subscribeWorkspaceRealtimeChanges((change) => {
      invalidateRealtimeChange(queryClient, change);
    });
  }, [queryClient]);

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
        dispatchWorkspaceRealtimeChange(change);
        queryClient.setQueryData(workspaceQueryKeys.bootstrap(), (previous) => {
          if (!previous) return previous;
          const key = TABLE_TO_STATE_KEY[table];
          if (!key || !Array.isArray(previous[key])) return previous;
          const eventType = String(change.eventType || '').toUpperCase();
          const row = change.row;
          const old = change.old;
          const target = row || old;
          if (!target) return previous;
          const nextRows = (eventType === 'DELETE' || isSoftDeleted(row)) ? removeById(previous[key], target) : upsertById(previous[key], row);
          return { ...previous, [key]: nextRows };
        });
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
