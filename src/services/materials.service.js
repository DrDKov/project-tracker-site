// @ts-check
import { dataOrThrow, listOrThrow } from './supabase-result.js';

export async function fetchMaterialProfileByCurrentUser(client) {
  const userIdResult = await client.rpc('current_app_user_id');
  if (!userIdResult.error && userIdResult.data) {
    const user = await client.from('app_users').select('id,display_name,email,role,is_active').eq('id', userIdResult.data).maybeSingle();
    if (!user.error && user.data) return user.data;
  }
  const authUser = await client.auth.getUser();
  const email = authUser && authUser.data && authUser.data.user && authUser.data.user.email;
  if (email) {
    const byEmail = await client.from('app_users').select('id,display_name,email,role,is_active').ilike('email', email).maybeSingle();
    if (!byEmail.error && byEmail.data) return byEmail.data;
  }
  return null;
}

export async function fetchMaterialsBundle(client) {
  const [templates, folders, files] = await Promise.all([
    client.from('workspace_templates').select('*').is('deleted_at', null).order('updated_at', { ascending: false }),
    client.from('material_folders').select('*').is('deleted_at', null).order('name', { ascending: true }),
    client.from('material_files').select('*').is('deleted_at', null).order('created_at', { ascending: false })
  ]);
  return {
    templates: listOrThrow(templates, 'Не удалось загрузить шаблоны'),
    folders: listOrThrow(folders, 'Не удалось загрузить папки материалов'),
    files: listOrThrow(files, 'Не удалось загрузить файлы материалов')
  };
}

export async function saveTemplate(client, workspaceId, currentUserId, id, title, body) {
  const request = id
    ? client.from('workspace_templates').update({ title, body }).eq('id', id).select().single()
    : client.from('workspace_templates').insert({ workspace_id: workspaceId, title, body, created_by: currentUserId }).select().single();
  return dataOrThrow(await request, 'Не удалось сохранить шаблон');
}

export async function softDeleteTemplate(client, id) {
  dataOrThrow(await client.from('workspace_templates').update({ deleted_at: new Date().toISOString() }).eq('id', id), 'Не удалось удалить шаблон');
  return true;
}

export async function createFolder(client, workspaceId, currentUserId, name) {
  return dataOrThrow(await client.from('material_folders').insert({ workspace_id: workspaceId, name, created_by: currentUserId }).select().single(), 'Не удалось создать папку');
}

export async function renameFolder(client, id, name) {
  dataOrThrow(await client.from('material_folders').update({ name }).eq('id', id), 'Не удалось переименовать папку');
  return true;
}

export async function softDeleteFolder(client, id) {
  dataOrThrow(await client.from('material_folders').update({ deleted_at: new Date().toISOString() }).eq('id', id), 'Не удалось удалить папку');
  return true;
}

export async function uploadMaterialFile(client, bucket, workspaceId, folderId, currentUserId, file, id, path) {
  const upload = await client.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined
  });
  if (upload.error) throw new Error(`Не удалось загрузить файл: ${upload.error.message}`);
  const row = {
    id,
    workspace_id: workspaceId,
    folder_id: folderId,
    original_name: file.name,
    storage_path: path,
    mime_type: file.type || null,
    size_bytes: file.size,
    created_by: currentUserId
  };
  const result = await client.from('material_files').insert(row).select().single();
  if (result.error) {
    await client.storage.from(bucket).remove([path]);
    throw new Error(result.error.message);
  }
  return result.data;
}

export async function createMaterialSignedUrl(client, bucket, storagePath, expiresIn = 600) {
  return dataOrThrow(await client.storage.from(bucket).createSignedUrl(storagePath, expiresIn), 'Не удалось создать ссылку на файл').signedUrl;
}

export async function deleteMaterialFile(client, bucket, fileRecord) {
  await client.storage.from(bucket).remove([fileRecord.storage_path]);
  dataOrThrow(await client.from('material_files').update({ deleted_at: new Date().toISOString() }).eq('id', fileRecord.id), 'Не удалось удалить файл');
  return true;
}
