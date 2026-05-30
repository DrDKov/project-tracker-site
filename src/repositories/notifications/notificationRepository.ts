import type { AppUser, ProjectMember, Task, TaskComment } from '../../types/entities';
import type { SupabaseClientLike } from '../../types/supabase';
import { assertRepositoryClient, repositoryCall, repositorySync } from '../repositoryError';
import {
  createTaskNotificationChannel,
  fetchCurrentNotificationUser,
  fetchNotificationMembers,
  fetchNotificationTask,
  fetchRecentAssignedTasks,
  fetchRecentTaskAssignees,
  fetchRecentTaskComments,
  removeNotificationChannel
} from '../../services/notifications.service.js';

export interface NotificationRepository {
  currentUser(): Promise<AppUser | null>;
  task(taskId: string): Promise<Task | null>;
  members(): Promise<ProjectMember[]>;
  recentAssignedTasks(sinceIso: string): Promise<Task[]>;
  recentTaskAssignees(userId: string, sinceIso: string): Promise<Array<{ id?: string; task_id: string; created_at?: string }>>;
  recentComments(sinceIso: string, limit?: number): Promise<TaskComment[]>;
  channel(channelName: string, handlers: Record<string, (...args: any[]) => void>): any;
  removeChannel(channel: any): void;
}

const DOMAIN = 'notifications';

export function createNotificationRepository(client: SupabaseClientLike): NotificationRepository {
  assertRepositoryClient(client, DOMAIN);
  return {
    currentUser: () => repositoryCall(DOMAIN, 'currentUser', () => fetchCurrentNotificationUser(client) as Promise<AppUser | null>),
    task: (taskId) => repositoryCall(DOMAIN, 'task', () => fetchNotificationTask(client, taskId) as Promise<Task | null>),
    members: () => repositoryCall(DOMAIN, 'members', () => fetchNotificationMembers(client) as Promise<ProjectMember[]>),
    recentAssignedTasks: (sinceIso) => repositoryCall(DOMAIN, 'recentAssignedTasks', () => fetchRecentAssignedTasks(client, sinceIso) as Promise<Task[]>),
    recentTaskAssignees: (userId, sinceIso) => repositoryCall(DOMAIN, 'recentTaskAssignees', () => fetchRecentTaskAssignees(client, userId, sinceIso) as Promise<Array<{ id?: string; task_id: string; created_at?: string }>>),
    recentComments: (sinceIso, limit = 80) => repositoryCall(DOMAIN, 'recentComments', () => fetchRecentTaskComments(client, sinceIso, limit) as Promise<TaskComment[]>),
    channel: (channelName, handlers) => repositorySync(DOMAIN, 'channel', () => createTaskNotificationChannel(client, channelName, handlers)),
    removeChannel: (channel) => repositorySync(DOMAIN, 'removeChannel', () => removeNotificationChannel(client, channel))
  };
}
