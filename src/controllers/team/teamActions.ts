import type { AppUser } from '../../types/entities';
import type { UserRepository, UserSaveInput } from '../../repositories';

export interface TeamActionControllerDeps {
  repository: UserRepository;
  reload: () => Promise<unknown>;
}

export function createTeamActionController(deps: TeamActionControllerDeps) {
  async function saveUser(id: string | null, row: UserSaveInput) {
    if (!row.display_name?.trim()) throw new Error('Введите имя');
    const saved = await deps.repository.save(id || null, row);
    await deps.reload();
    return saved as AppUser;
  }

  async function deactivateUser(id: string) {
    await deps.repository.deactivate(id);
    await deps.reload();
  }

  return { saveUser, deactivateUser };
}
