import type { DeleteRepository } from '../../repositories';

export interface DeleteActionControllerDeps {
  repository: DeleteRepository;
  reload: () => Promise<unknown>;
  confirmDelete?: (message: string) => boolean;
}

export function createDeleteActionController(deps: DeleteActionControllerDeps) {
  async function softDelete(table: string, id: string, message = 'Удалить?') {
    if (!table || !id) return false;
    if (deps.confirmDelete && !deps.confirmDelete(message)) return false;
    await deps.repository.softDelete(table, id);
    await deps.reload();
    return true;
  }

  return { softDelete };
}
