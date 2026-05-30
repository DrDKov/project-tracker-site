import type { AppUser } from '../../types/entities';
import type { SupabaseClientLike } from '../../types/supabase';
import { assertRepositoryClient, repositoryCall } from '../repositoryError';
import { fetchReferenceData, saveUserRecord, softDeleteRecord } from '../../services/workspace.service.js';

export interface UserSaveInput extends Partial<AppUser> {
  display_name: string;
}

export interface UserRepository {
  list(warnings?: string[]): Promise<AppUser[]>;
  save(id: string | null, row: UserSaveInput): Promise<AppUser>;
  deactivate(id: string): Promise<unknown>;
}

const DOMAIN = 'users';

export function createUserRepository(client: SupabaseClientLike): UserRepository {
  assertRepositoryClient(client, DOMAIN);
  return {
    list: (warnings = []) => repositoryCall(DOMAIN, 'list', async () => ((await fetchReferenceData(client, warnings)) as { users: AppUser[] }).users || []),
    save: (id, row) => repositoryCall(DOMAIN, 'save', () => saveUserRecord(client, id, row) as Promise<AppUser>),
    deactivate: (id) => repositoryCall(DOMAIN, 'deactivate', () => softDeleteRecord(client, 'app_users', id))
  };
}
