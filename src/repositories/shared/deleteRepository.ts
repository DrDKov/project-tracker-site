import type { SupabaseClientLike } from '../../types/supabase';
import { assertRepositoryClient, repositoryCall } from '../repositoryError';
import { softDeleteRecord } from '../../services/workspace.service.js';

export interface DeleteRepository {
  softDelete(table: string, id: string): Promise<unknown>;
}

const DOMAIN = 'delete';

export function createDeleteRepository(client: SupabaseClientLike): DeleteRepository {
  assertRepositoryClient(client, DOMAIN);
  return {
    softDelete: (table, id) => repositoryCall(DOMAIN, 'softDelete', () => softDeleteRecord(client, table, id))
  };
}
