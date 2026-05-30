import type { ProjectMember } from '../../types/entities';
import type { ProjectRepository, ProjectSaveInput } from '../../repositories';

export interface ProjectActionControllerDeps {
  repository: ProjectRepository;
  reload: () => Promise<unknown>;
  renderAccess: () => void;
}

export function createProjectActionController(deps: ProjectActionControllerDeps) {
  async function saveProject(id: string | null, row: ProjectSaveInput) {
    if (!row.name?.trim()) throw new Error('Введите название проекта');
    const saved = await deps.repository.save(id || null, row);
    await deps.reload();
    return saved;
  }

  async function saveAccess(row: ProjectMember) {
    if (!row.project_id || !row.user_id) return false;
    await deps.repository.upsertMember(row);
    await deps.reload();
    deps.renderAccess();
    return true;
  }

  async function removeAccess(memberId: string) {
    await deps.repository.removeMember(memberId);
    await deps.reload();
    deps.renderAccess();
  }

  return { saveProject, saveAccess, removeAccess };
}
