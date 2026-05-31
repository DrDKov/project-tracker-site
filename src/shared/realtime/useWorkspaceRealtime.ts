// @ts-nocheck
import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeWorkspaceRealtimeChanges, dispatchWorkspaceRealtimeChange } from './realtimeEvents';
import { invalidateRealtimeChange } from './realtimeInvalidation';
import { useWorkspaceState } from '../../react/state/useWorkspaceStore';
import { workspaceQueryKeys } from '../../react/data/queries/workspaceQueryKeys';
import { invalidateWorkspaceData } from '../../app/workspaceRuntime';

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
    const channel = client.channel('workspace-react-realtime');
    REALTIME_TABLES.forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        dispatchWorkspaceRealtimeChange({
          table,
          eventType: payload.eventType || payload.type || 'UPDATE',
          row: payload.new || null,
          old: payload.old || null,
          source: 'supabase'
        });
        queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.bootstrap() });
        invalidateWorkspaceData();
      });
    });
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.info('[workspace-realtime] subscribed');
      }
    });
    return () => {
      if (typeof client.removeChannel === 'function') client.removeChannel(channel);
      else if (typeof channel.unsubscribe === 'function') channel.unsubscribe();
    };
  }, [client, profileId, queryClient]);
}
