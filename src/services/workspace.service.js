// @ts-check
import { dataOrThrow, listOrThrow, runOptional, runRequired } from './supabase-result.js';

export async function fetchProfileByAuthUserId(client, authUserId) {
  const result = await client.from('app_users').select('*').eq('auth_user_id', authUserId).maybeSingle();
  return dataOrThrow(result, 'Не удалось загрузить профиль по auth_user_id');
}

export async function fetchProfileByEmail(client, email) {
  const result = await client.from('app_users').select('*').eq('email', email).maybeSingle();
  return dataOrThrow(result, 'Не удалось загрузить профиль по email');
}

export async function bindProfileToAuthUser(client, profileId, authUserId) {
  const result = await client.from('app_users').update({ auth_user_id: authUserId }).eq('id', profileId);
  dataOrThrow(result, 'Не удалось привязать профиль');
  return true;
}

export async function fetchCurrentAppUserId(client) {
  const result = await client.rpc('current_app_user_id');
  return dataOrThrow(result, 'Не удалось определить текущего пользователя приложения');
}

export async function fetchProjects(client) {
  return listOrThrow(await client.from('projects').select('*').order('created_at', { ascending: true }), 'Не удалось загрузить проекты');
}

export async function fetchProjectsRequired(client, timeoutMs = 12000) {
  return runRequired('projects', client.from('projects').select('*').order('created_at', { ascending: true }), timeoutMs);
}

export async function fetchActiveUsers(client) {
  return listOrThrow(await client.from('app_users').select('*').eq('is_active', true).order('created_at', { ascending: true }), 'Не удалось загрузить пользователей');
}

export async function fetchAllUsers(client) {
  return listOrThrow(await client.from('app_users').select('id,display_name,email,role,is_active').order('display_name', { ascending: true }), 'Не удалось загрузить пользователей');
}

export async function fetchProjectMembers(client) {
  return listOrThrow(await client.from('project_members').select('*').order('created_at', { ascending: true }), 'Не удалось загрузить участников проектов');
}

export async function fetchProjectMembersThin(client) {
  return listOrThrow(await client.from('project_members').select('project_id,user_id,access_role'), 'Не удалось загрузить участников проектов');
}

export async function fetchReferenceData(client, warnings) {
  const [users, members, assignees, subtasks, taskComments, messages] = await Promise.all([
    runOptional('app_users', client.from('app_users').select('*').eq('is_active', true).order('created_at', { ascending: true }), 7000, warnings),
    runOptional('project_members', client.from('project_members').select('*').order('created_at', { ascending: true }), 6000, warnings),
    runOptional('task_assignees', client.from('task_assignees').select('*').order('created_at', { ascending: true }), 6000, warnings),
    runOptional('task_subtasks', client.from('task_subtasks').select('*').order('created_at', { ascending: true }), 6000, warnings),
    runOptional('task_comments', client.from('task_comments').select('*').is('deleted_at', null).order('created_at', { ascending: true }), 7000, warnings),
    runOptional('project_messages', client.from('project_messages').select('*').order('created_at', { ascending: true }), 6000, warnings)
  ]);
  return { users, members, assignees, subtasks, taskComments, messages };
}

export async function fetchActivityLog(client, warnings) {
  return runOptional('activity_log', client.from('activity_log').select('*').order('created_at', { ascending: false }).limit(500), 7000, warnings);
}

export async function fetchRealtimeSnapshot(client, warnings) {
  const [projects, users, assignees, subtasks, taskComments] = await Promise.all([
    runOptional('projects/realtime', client.from('projects').select('*').order('created_at', { ascending: true }), 9000, warnings),
    runOptional('app_users/realtime', client.from('app_users').select('*').eq('is_active', true).order('created_at', { ascending: true }), 7000, warnings),
    runOptional('task_assignees/realtime', client.from('task_assignees').select('*').order('created_at', { ascending: true }), 7000, warnings),
    runOptional('task_subtasks/realtime', client.from('task_subtasks').select('*').order('created_at', { ascending: true }), 7000, warnings),
    runOptional('task_comments/realtime', client.from('task_comments').select('*').is('deleted_at', null).order('created_at', { ascending: true }), 7000, warnings)
  ]);
  return { projects, users, assignees, subtasks, taskComments };
}

export async function saveProjectRecord(client, id, row) {
  const request = id
    ? client.from('projects').update(row).eq('id', id).select().single()
    : client.from('projects').insert(row).select().single();
  return dataOrThrow(await request, 'Не удалось сохранить проект');
}

export async function saveUserRecord(client, id, row) {
  const request = id
    ? client.from('app_users').update(row).eq('id', id).select().single()
    : client.from('app_users').insert(row).select().single();
  return dataOrThrow(await request, 'Не удалось сохранить пользователя');
}

export async function upsertProjectMember(client, row) {
  const result = await client.from('project_members').upsert(row, { onConflict: 'project_id,user_id' });
  dataOrThrow(result, 'Не удалось сохранить доступ к проекту');
  return true;
}

export async function removeProjectMember(client, id) {
  const result = await client.from('project_members').delete().eq('id', id);
  dataOrThrow(result, 'Не удалось удалить участника проекта');
  return true;
}

export async function softDeleteRecord(client, table, id) {
  const result = await client.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id);
  dataOrThrow(result, `Не удалось удалить запись ${table}`);
  return true;
}
