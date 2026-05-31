import type { DeleteRepository } from '../../repositories';

export interface DeleteActionControllerDeps {
  repository: DeleteRepository;
  reload: () => Promise<unknown>;
  confirmDelete?: (message: string) => boolean;
}

type WorkspaceDeleteHooks = {
  __workspaceRemoveDeletedTask?: (taskId: string) => void;
  __workspaceBroadcastTaskDeleted?: (taskId: string) => Promise<unknown> | unknown;
};

export function createDeleteActionController(deps: DeleteActionControllerDeps) {
  async function softDelete(table: string, id: string, message = 'Удалить?') {
    if (!table || !id) return false;
    if (deps.confirmDelete && !deps.confirmDelete(message)) return false;
    await deps.repository.softDelete(table, id);
    if (table === 'tasks') {
      const workspaceHooks = globalThis as typeof globalThis & WorkspaceDeleteHooks;
      workspaceHooks.__workspaceRemoveDeletedTask?.(id);
      const broadcastResult = workspaceHooks.__workspaceBroadcastTaskDeleted?.(id);
      if (broadcastResult && typeof (broadcastResult as Promise<unknown>).catch === 'function') {
        (broadcastResult as Promise<unknown>).catch(() => undefined);
      }
    } else {
      await deps.reload();
    }
    return true;
  }

  return { softDelete };
}
