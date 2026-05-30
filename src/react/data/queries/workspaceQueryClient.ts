import { getWorkspaceSnapshot } from '../../state/workspaceStoreAdapter.ts';
import type { SupabaseClientLike } from '../../../types/supabase';

export function getWorkspaceSupabaseClient(): SupabaseClientLike | null {
  const state = getWorkspaceSnapshot();
  return (state?.sb || null) as SupabaseClientLike | null;
}

export function requireWorkspaceSupabaseClient(): SupabaseClientLike {
  const client = getWorkspaceSupabaseClient();
  if (!client) throw new Error('Supabase client is not ready');
  return client;
}
