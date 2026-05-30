import type { AppUser, Project, ProjectMember } from '../../types/entities';
import type { SupabaseClientLike } from '../../types/supabase';
import { assertRepositoryClient, repositoryCall } from '../repositoryError';
import {
  fetchProjectsRequired,
  fetchReferenceData,
  removeProjectMember,
  saveProjectRecord,
  upsertProjectMember
} from '../../services/workspace.service.js';

export interface ProjectSaveInput extends Partial<Project> {
  name: string;
}

export interface ProjectReferenceData {
  users: AppUser[];
  members: ProjectMember[];
  assignees: unknown[];
  subtasks: unknown[];
  taskComments: unknown[];
  messages: unknown[];
}

export interface ProjectRepository {
  listRequired(timeoutMs?: number): Promise<Project[]>;
  save(id: string | null, row: ProjectSaveInput): Promise<Project>;
  loadReferenceData(warnings?: string[]): Promise<ProjectReferenceData>;
  upsertMember(row: ProjectMember): Promise<boolean>;
  removeMember(id: string): Promise<unknown>;
}

const DOMAIN = 'projects';

export function createProjectRepository(client: SupabaseClientLike): ProjectRepository {
  assertRepositoryClient(client, DOMAIN);
  return {
    listRequired: (timeoutMs = 12000) => repositoryCall(DOMAIN, 'listRequired', () => fetchProjectsRequired(client, timeoutMs) as Promise<Project[]>),
    save: (id, row) => repositoryCall(DOMAIN, 'save', () => saveProjectRecord(client, id, row) as Promise<Project>),
    loadReferenceData: (warnings = []) => repositoryCall(DOMAIN, 'loadReferenceData', () => fetchReferenceData(client, warnings) as Promise<ProjectReferenceData>),
    upsertMember: (row) => repositoryCall(DOMAIN, 'upsertMember', () => upsertProjectMember(client, row) as Promise<boolean>),
    removeMember: (id) => repositoryCall(DOMAIN, 'removeMember', () => removeProjectMember(client, id))
  };
}
