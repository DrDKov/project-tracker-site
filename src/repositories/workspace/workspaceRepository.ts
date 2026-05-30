import type {
  AppUser,
  Project,
  ProjectMember,
  ProjectMessage,
  Subtask,
  TaskAssignee,
  TaskComment
} from '../../types/entities';
import type { SupabaseClientLike } from '../../types/supabase';
import { assertRepositoryClient, repositoryCall } from '../repositoryError';
import {
  fetchActivityLog,
  fetchRealtimeSnapshot,
  fetchReferenceData
} from '../../services/workspace.service.js';

export interface WorkspaceReferenceData {
  users: AppUser[];
  members: ProjectMember[];
  assignees: TaskAssignee[];
  subtasks: Subtask[];
  taskComments: TaskComment[];
  messages: ProjectMessage[];
}

export interface WorkspaceRealtimeSnapshot {
  projects: Project[];
  users: AppUser[];
  assignees: TaskAssignee[];
  subtasks: Subtask[];
  taskComments: TaskComment[];
}

export interface WorkspaceRepository {
  referenceData(warnings?: string[]): Promise<WorkspaceReferenceData>;
  activityLog(warnings?: string[]): Promise<Array<Record<string, unknown>>>;
  realtimeSnapshot(warnings?: string[]): Promise<WorkspaceRealtimeSnapshot>;
}

const DOMAIN = 'workspace';

export function createWorkspaceRepository(client: SupabaseClientLike): WorkspaceRepository {
  assertRepositoryClient(client, DOMAIN);
  return {
    referenceData: (warnings = []) => repositoryCall(DOMAIN, 'referenceData', () => fetchReferenceData(client, warnings) as Promise<WorkspaceReferenceData>),
    activityLog: (warnings = []) => repositoryCall(DOMAIN, 'activityLog', () => fetchActivityLog(client, warnings) as Promise<Array<Record<string, unknown>>>),
    realtimeSnapshot: (warnings = []) => repositoryCall(DOMAIN, 'realtimeSnapshot', () => fetchRealtimeSnapshot(client, warnings) as Promise<WorkspaceRealtimeSnapshot>)
  };
}
