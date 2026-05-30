import { createWorkspaceRealtimeChannel, removeRealtimeChannel } from '../../services/realtime.service.js';
import type { SupabaseClientLike } from '../../types/supabase';
import type { WorkspaceRealtimeChange, WorkspaceRealtimeTable } from './realtimeEvents';

export interface WorkspaceRealtimeSubscription {
  channel: any;
  subscribe: (callback: (status: string) => void) => any;
  unsubscribe: () => void;
}

export interface SupabaseRealtimePayload {
  eventType: string;
  new?: Record<string, unknown> | null;
  old?: Record<string, unknown> | null;
}

export function normalizeSupabaseRealtimePayload(table: WorkspaceRealtimeTable, payload: SupabaseRealtimePayload): WorkspaceRealtimeChange {
  const row = payload.eventType === 'DELETE' ? (payload.old || null) : (payload.new || null);
  return {
    table,
    eventType: payload.eventType,
    row,
    old: payload.old || null,
    source: 'supabase'
  };
}

export function createWorkspaceRealtimeSubscription(
  client: SupabaseClientLike,
  name: string,
  onChange: (table: WorkspaceRealtimeTable, payload: SupabaseRealtimePayload) => void
): WorkspaceRealtimeSubscription {
  const channel = createWorkspaceRealtimeChannel(client, name, onChange);
  return {
    channel,
    subscribe: (callback) => channel.subscribe(callback),
    unsubscribe: () => removeRealtimeChannel(client, channel)
  };
}

export function removeWorkspaceRealtimeSubscription(client: SupabaseClientLike, subscription: WorkspaceRealtimeSubscription | null | undefined) {
  if (!subscription) return;
  removeRealtimeChannel(client, subscription.channel || subscription);
}
