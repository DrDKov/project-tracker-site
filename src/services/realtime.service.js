// @ts-check
export const WORKSPACE_REALTIME_TABLES = ['tasks', 'task_assignees', 'task_subtasks', 'task_comments', 'projects', 'app_users'];

export function createWorkspaceRealtimeChannel(client, channelName, onPayload) {
  const channel = client.channel(channelName);
  WORKSPACE_REALTIME_TABLES.forEach((table) => {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => onPayload(table, payload));
  });
  return channel;
}

export function removeRealtimeChannel(client, channel) {
  if (!client || !channel) return;
  client.removeChannel(channel);
}
