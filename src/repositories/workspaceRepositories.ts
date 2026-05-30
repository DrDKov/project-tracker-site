import type { SupabaseClientLike } from '../types/supabase';
import { assertRepositoryClient } from './repositoryError';
import { createTaskRepository, type TaskRepository } from './tasks/taskRepository';
import { createProjectRepository, type ProjectRepository } from './projects/projectRepository';
import { createMaterialRepository, type MaterialRepository } from './materials/materialRepository';
import { createNotificationRepository, type NotificationRepository } from './notifications/notificationRepository';
import { createUserRepository, type UserRepository } from './users/userRepository';
import { createChatRepository, type ChatRepository } from './chat/chatRepository';
import { createDeleteRepository, type DeleteRepository } from './shared/deleteRepository';
import { createWorkspaceRepository, type WorkspaceRepository } from './workspace/workspaceRepository';

export interface WorkspaceRepositorySet {
  tasks: TaskRepository;
  projects: ProjectRepository;
  materials: MaterialRepository;
  notifications: NotificationRepository;
  users: UserRepository;
  chat: ChatRepository;
  delete: DeleteRepository;
  workspace: WorkspaceRepository;
}

export function createWorkspaceRepositorySet(client: SupabaseClientLike): WorkspaceRepositorySet {
  assertRepositoryClient(client, 'workspace');
  return Object.freeze({
    tasks: createTaskRepository(client),
    projects: createProjectRepository(client),
    materials: createMaterialRepository(client),
    notifications: createNotificationRepository(client),
    users: createUserRepository(client),
    chat: createChatRepository(client),
    delete: createDeleteRepository(client),
    workspace: createWorkspaceRepository(client)
  });
}
