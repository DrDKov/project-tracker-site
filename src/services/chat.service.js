// @ts-check
import { dataOrThrow } from './supabase-result.js';

export function safeStorageName(name) {
  return (name || 'file').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-90);
}

export async function uploadProjectChatFiles(client, bucket, projectId, files) {
  const out = [];
  for (const file of files || []) {
    const path = `${projectId}/${Date.now()}_${Math.random().toString(36).slice(2)}_${safeStorageName(file.name)}`;
    const upload = await client.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined
    });
    if (upload.error) throw new Error(`Не удалось загрузить файл «${file.name}»: ${upload.error.message}`);
    const publicUrl = client.storage.from(bucket).getPublicUrl(path).data?.publicUrl || '';
    const signed = await client.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 30);
    const url = signed?.data?.signedUrl || publicUrl;
    out.push({ name: file.name, url, type: file.type, isImage: (file.type || '').startsWith('image/') });
  }
  return out;
}

export async function createProjectMessage(client, row) {
  return dataOrThrow(await client.from('project_messages').insert(row).select().single(), 'Не удалось отправить сообщение');
}

export async function deleteProjectMessage(client, id) {
  let result = await client.from('project_messages').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (result.error) result = await client.from('project_messages').delete().eq('id', id);
  dataOrThrow(result, 'Не удалось удалить сообщение');
  return true;
}

export async function clearProjectMessages(client, projectId) {
  let result = await client.from('project_messages').update({ deleted_at: new Date().toISOString() }).eq('project_id', projectId);
  if (result.error) result = await client.from('project_messages').delete().eq('project_id', projectId);
  dataOrThrow(result, 'Не удалось очистить чат');
  return true;
}
