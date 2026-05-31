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
function taskTitle(taskId, state) {
  const task = (state.tasks || []).find((item) => String(item.id) === String(taskId));
  return task?.title || 'Задача';
}
function notificationExists(items, id) {
  return (items || []).some((item) => String(item.id || item.notification_id || '') === String(id));
}
function normalizeMentionText(value) {
  return String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9@._\-/\s]+/gi, ' ').replace(/\s+/g, ' ').trim();
}
function mentionAliases(user) {
  const out = new Set();
  const display = String(user?.display_name || '').trim();
  const email = String(user?.email || '').trim();
  if (display) {
    out.add(display);
    const first = display.split(/\s+/).filter(Boolean)[0];
    if (first) out.add(first);
  }
  if (email) {
    out.add(email);
    out.add(email.split('@')[0]);
  }
  return Array.from(out).filter(Boolean).map((item) => normalizeMentionText(`@${item}`));
}
function commentMentionsUser(body, user) {
  const text = normalizeMentionText(body);
  if (!text || !user) return false;
  return mentionAliases(user).some((alias) => alias && text.includes(alias));
}
function pushNotification(notification) {
  if (!notification?.id) return;
  const state = appStore.getState() || {};
  const current = state.notifications || [];
  if (notificationExists(current, notification.id)) return;
  appStore.setState({ notifications: [notification, ...current] }, { source: 'realtime:notifications', stage: 'react-realtime-local' });
}
function synthesizeNotification(table, change) {
  const eventType = String(change.eventType || '').toUpperCase();
  if (eventType !== 'INSERT') return;
  const row = change.row || null;
  if (!row) return;
  const state = appStore.getState() || {};
  const profile = state.profile;
  if (!profile?.id) return;

  if (table === 'task_assignees' && String(row.user_id || '') === String(profile.id)) {
    const id = `assignment:${row.task_id}:${row.created_at || row.id || ''}`;
    pushNotification({
      id,
      type: 'task_assigned',
      task_id: row.task_id,
      user_id: profile.id,
      title: 'Вам назначена задача',
      body: taskTitle(row.task_id, state),
      unread: true,
      is_read: false,
      created_at: row.created_at || new Date().toISOString()
    });
  }

  if (table === 'task_comments' && row.task_id && String(row.user_id || row.author_id || '') !== String(profile.id)) {
    const body = row.body || row.content || '';
    if (!commentMentionsUser(body, profile)) return;
    const id = `mention:${row.id || row.task_id}:${row.created_at || ''}`;
    pushNotification({
      id,
      type: 'task_mention',
      task_id: row.task_id,
      user_id: profile.id,
      title: 'Вас упомянули в комментарии',
      body: `${taskTitle(row.task_id, state)} · ${String(body).slice(0, 160)}`,
      unread: true,
      is_read: false,
      created_at: row.created_at || new Date().toISOString()
    });
  }
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
        synthesizeNotification(table, change);
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
