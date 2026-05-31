// @ts-nocheck
import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeWorkspaceRealtimeChanges, dispatchWorkspaceRealtimeChange } from './realtimeEvents';
import { invalidateRealtimeChange } from './realtimeInvalidation';
import { useWorkspaceState } from '../../react/state/useWorkspaceStore';
import { workspaceQueryKeys } from '../../react/data/queries/workspaceQueryKeys';
import { invalidateWorkspaceData } from '../../app/workspaceRuntime';
import { appStore } from '../../core/state/store';

const REALTIME_TABLES = [
  'projects',
  'tasks',
  'task_assignees',
  'task_subtasks',
  'task_comments',
  'project_messages',
  'material_templates',
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
  material_templates: 'materialTemplates',
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

function softRefreshWorkspace(source = 'react-realtime-refresh') {
  window.clearTimeout(window.__workspaceRealtimeReloadTimer);
  window.__workspaceRealtimeReloadTimer = window.setTimeout(() => {
    invalidateWorkspaceData().catch((error) => console.warn(`[${source}] failed`, error));
  }, 250);
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
    let subscribed = false;
    const channel = client.channel(`workspace-react-realtime:${profileId}`);
    REALTIME_TABLES.forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        subscribed = true;
        const change = {
          table,
          eventType: payload.eventType || payload.type || 'UPDATE',
          row: payload.new || null,
          old: payload.old || null,
          source: 'supabase'
        };
        applyRealtimePayload(table, change);
        dispatchWorkspaceRealtimeChange(change);
        queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.bootstrap() });
        softRefreshWorkspace('react-realtime-event');
      });
    });
    channel.subscribe((status) => {
      window.__workspaceRealtimeStatus = status;
      if (status === 'SUBSCRIBED') {
        subscribed = true;
        console.info('[workspace-realtime] subscribed');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.warn('[workspace-realtime] status', status);
      }
    });
    return () => {
      if (typeof client.removeChannel === 'function') client.removeChannel(channel);
      else if (typeof channel.unsubscribe === 'function') channel.unsubscribe();
    };
  }, [client, profileId, queryClient]);

  React.useEffect(() => {
    if (!client || !profileId) return undefined;
    const interval = window.setInterval(() => {
      const current = appStore.getState() || {};
      if (!current.profile?.id) return;
      if (document.visibilityState !== 'visible') return;
      invalidateWorkspaceData().catch((error) => console.warn('[workspace-polling-fallback] failed', error));
    }, 5000);
    return () => window.clearInterval(interval);
  }, [client, profileId]);
}
