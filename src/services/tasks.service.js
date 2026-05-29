// @ts-check
import { dataOrThrow, listOrThrow, withTimeout } from './supabase-result.js';

export const TASK_COLUMNS = 'id,project_id,title,notes,status,priority,start_date,due_date,start_time,end_time,duration_minutes,is_all_day,created_at,updated_at,deleted_at,assignee_id,completed_at,sort_order,is_favorite,recurrence_rule_id,recurrence_date';

export async function fetchTasksPaged(client, { page = 200, max = 3000, timeoutMs = 30000, onProgress = null } = {}) {
  const out = [];
  for (let from = 0; from < max; from += page) {
    const to = from + page - 1;
    const request = client.from('tasks').select(TASK_COLUMNS).is('deleted_at', null).order('created_at', { ascending: true }).range(from, to);
    const result = await withTimeout(request, `tasks ${from}-${to}`, timeoutMs);
    if (result.error) throw new Error(`tasks: ${result.error.message}`);
    const rows = result.data || [];
    out.push(...rows);
    if (onProgress) onProgress(out.length);
    if (rows.length < page) break;
  }
  return out;
}

export async function saveTaskRecord(client, id, row) {
  const request = id
    ? client.from('tasks').update(row).eq('id', id).select().single()
    : client.from('tasks').insert(row).select().single();
  return dataOrThrow(await request, 'Не удалось сохранить задачу');
}

export async function replaceTaskAssignees(client, taskId, userIds) {
  await client.from('task_assignees').delete().eq('task_id', taskId);
  if (!userIds || !userIds.length) return [];
  const result = await client.from('task_assignees').insert(userIds.map((user_id) => ({ task_id: taskId, user_id })));
  dataOrThrow(result, 'Не удалось сохранить исполнителей задачи');
  return userIds.map((user_id) => ({ task_id: taskId, user_id }));
}

export async function setTaskFavorite(client, taskId, isFavorite) {
  const result = await client.from('tasks').update({ is_favorite: isFavorite, updated_at: new Date().toISOString() }).eq('id', taskId);
  dataOrThrow(result, 'Не удалось изменить избранность задачи');
  return true;
}

export async function addTaskCommentRecord(client, row) {
  return dataOrThrow(await client.from('task_comments').insert(row).select('*').single(), 'Не удалось добавить комментарий');
}

export async function saveTaskOrder(client, taskIds, start = 1000, step = 1000) {
  let sortOrder = start;
  const now = new Date().toISOString();
  for (const id of taskIds) {
    const result = await client.from('tasks').update({ sort_order: sortOrder, updated_at: now }).eq('id', id);
    if (result.error) throw new Error(`sort_order: ${result.error.message}`);
    sortOrder += step;
  }
  return true;
}

export async function setTaskPrimaryAssignee(client, taskId, userId) {
  const value = userId && userId !== '__none__' ? userId : null;
  const result = await client.from('tasks').update({ assignee_id: value, updated_at: new Date().toISOString() }).eq('id', taskId);
  if (result.error) throw new Error(`tasks.assignee_id: ${result.error.message}`);
  const deleteResult = await client.from('task_assignees').delete().eq('task_id', taskId);
  if (deleteResult.error) throw new Error(`task_assignees delete: ${deleteResult.error.message}`);
  if (value) {
    const insertResult = await client.from('task_assignees').insert({ task_id: taskId, user_id: value });
    if (insertResult.error) throw new Error(`task_assignees insert: ${insertResult.error.message}`);
  }
  return value;
}

export async function updateTaskDateRange(client, taskId, patch) {
  const result = await client.from('tasks').update(patch).eq('id', taskId);
  if (result.error) throw new Error(`date update: ${result.error.message}`);
  return true;
}

export async function updateTaskCompletion(client, taskId, done, profileId = null) {
  const base = { status: done ? 'done' : 'in_progress', completed_at: done ? new Date().toISOString() : null };
  let result = await client.from('tasks').update({ ...base, completed_by_id: done ? profileId : null }).eq('id', taskId);
  if (result.error) result = await client.from('tasks').update(base).eq('id', taskId);
  dataOrThrow(result, 'Не удалось изменить статус задачи');
  return base;
}

export async function updateTaskStatus(client, taskId, status, profileId = null) {
  const base = { status, completed_at: status === 'done' ? new Date().toISOString() : null };
  let result = await client.from('tasks').update({ ...base, completed_by_id: status === 'done' ? profileId : null }).eq('id', taskId);
  if (result.error) result = await client.from('tasks').update(base).eq('id', taskId);
  dataOrThrow(result, 'Не удалось переместить задачу');
  return base;
}

export async function updateTaskTimelineDates(client, taskId, startDate, dueDate) {
  const result = await client.from('tasks').update({ start_date: startDate, due_date: dueDate }).eq('id', taskId);
  dataOrThrow(result, 'Не удалось изменить даты задачи');
  return true;
}

export async function createSubtaskRecord(client, row) {
  return dataOrThrow(await client.from('task_subtasks').insert(row).select().single(), 'Не удалось создать подзадачу');
}

export async function updateSubtaskDone(client, id, done) {
  const result = await client.from('task_subtasks').update({ is_done: done, completed_at: done ? new Date().toISOString() : null }).eq('id', id);
  dataOrThrow(result, 'Не удалось изменить подзадачу');
  return true;
}

export async function deleteSubtaskRecord(client, id) {
  let result = await client.from('task_subtasks').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (result.error) result = await client.from('task_subtasks').delete().eq('id', id);
  dataOrThrow(result, 'Не удалось удалить подзадачу');
  return true;
}

export async function createRecurringTaskSet(client, ruleDraft, taskRows, selectedUserIds) {
  const rule = dataOrThrow(await client.from('task_recurrence_rules').insert(ruleDraft).select().single(), 'Не удалось создать правило повторения');
  const rows = taskRows.map((row) => ({ ...row, recurrence_rule_id: rule.id }));
  const inserted = listOrThrow(await client.from('tasks').insert(rows).select('id,recurrence_date'), 'Не удалось создать повторяющиеся задачи');
  if (inserted && inserted[0] && inserted[0].id) {
    await client.from('task_recurrence_rules').update({ source_task_id: inserted[0].id }).eq('id', rule.id).then(() => 0);
  }
  if (selectedUserIds && selectedUserIds.length && inserted && inserted.length) {
    const links = [];
    inserted.forEach((task) => selectedUserIds.forEach((user_id) => links.push({ task_id: task.id, user_id })));
    if (links.length) await client.from('task_assignees').insert(links).then(() => 0);
  }
  return inserted;
}

export async function hardDeleteTask(client, taskId) {
  const result = await client.from('tasks').delete().eq('id', taskId);
  dataOrThrow(result, 'Не удалось удалить задачу');
  return true;
}

export async function softDeleteTask(client, taskId) {
  const result = await client.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', taskId);
  dataOrThrow(result, 'Не удалось удалить задачу');
  return true;
}

export async function deleteTaskCommentRecord(client, commentId) {
  let result = await client.rpc('soft_delete_task_comment', { p_comment_id: commentId });
  if (result.error) {
    result = await client.from('task_comments').update({ deleted_at: new Date().toISOString() }).eq('id', commentId).select('*').single();
  }
  return dataOrThrow(result, 'Не удалось удалить комментарий');
}
