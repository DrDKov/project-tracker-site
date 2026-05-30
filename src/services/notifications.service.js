// @ts-check
import { dataOrThrow, listOrThrow } from './supabase-result.js';

export async function fetchNotificationTask(client, taskId) {
  const result = await client.from('tasks').select('id,project_id,title,notes,status,priority,start_date,due_date,start_time,end_time,duration_minutes,is_all_day,created_at,updated_at,updated_by,updated_by_id,deleted_at,assignee_id').eq('id', taskId).maybeSingle();
  return dataOrThrow(result, 'Не удалось загрузить задачу уведомления');
}

export async function fetchNotificationMembers(client) {
  return listOrThrow(await client.from('project_members').select('*').order('created_at', { ascending: true }), 'Не удалось загрузить участников проектов');
}

export async function fetchCurrentNotificationUser(client) {
  const rpc = await client.rpc('current_app_user_id');
  if (rpc.data) {
    const user = await client.from('app_users').select('id,display_name,email').eq('id', rpc.data).maybeSingle();
    if (!user.error) return user.data;
  }
  return null;
}

export async function fetchRecentAssignedTasks(client, sinceIso) {
  return listOrThrow(await client.from('tasks').select('id,title,assignee_id,updated_at').gte('updated_at', sinceIso), 'Не удалось загрузить недавние задачи');
}

export async function fetchRecentTaskAssignees(client, userId, sinceIso) {
  return listOrThrow(await client.from('task_assignees').select('id,task_id,created_at').eq('user_id', userId).gte('created_at', sinceIso), 'Не удалось загрузить назначения задач');
}

export async function fetchRecentTaskComments(client, sinceIso, limit = 80) {
  return listOrThrow(await client.from('task_comments').select('id,task_id,body,user_id,created_at').gte('created_at', sinceIso).limit(limit), 'Не удалось загрузить комментарии');
}

export function createTaskNotificationChannel(client, channelName, handlers) {
  const channel = client.channel(channelName);
  channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_assignees' }, handlers.onTaskAssigneeInsert);
  channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, handlers.onTaskUpdate);
  channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_comments' }, handlers.onTaskCommentInsert);
  return channel;
}

export function removeNotificationChannel(client, channel) {
  if (!client || !channel) return;
  client.removeChannel(channel);
}
