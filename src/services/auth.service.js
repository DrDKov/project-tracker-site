// @ts-check
import { dataOrThrow } from './supabase-result.js';

export async function getSessionUser(client) {
  const result = await client.auth.getSession();
  return result && result.data && result.data.session ? result.data.session.user : null;
}

export async function getAuthUser(client) {
  const result = await client.auth.getUser();
  return result && result.data ? result.data.user : null;
}

export async function signInWithPassword(client, email, password) {
  const result = await client.auth.signInWithPassword({ email, password });
  dataOrThrow(result, 'Не удалось войти');
  return result.data;
}

export async function signOut(client) {
  const result = await client.auth.signOut();
  dataOrThrow(result, 'Не удалось выйти');
  return true;
}

export function clearSupabaseAuthStorage(storage = localStorage) {
  try {
    Object.keys(storage).forEach((key) => {
      if (key.startsWith('sb-') || key.includes('supabase.auth')) storage.removeItem(key);
    });
  } catch (_) {}
}

export function isRetryableAuthError(error) {
  const message = String((error && error.message) || error || '');
  return /AuthRetryableFetchError|Failed to fetch|NetworkError|fetch/i.test(message);
}
