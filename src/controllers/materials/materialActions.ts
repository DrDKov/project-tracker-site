import type { MaterialFile } from '../../types/entities';
import type { MaterialRepository, MaterialRepositoryContext } from '../../repositories';

export interface MaterialActionControllerDeps {
  repository: MaterialRepository;
  context: () => MaterialRepositoryContext;
  reload: () => Promise<unknown>;
}

export function createMaterialActionController(deps: MaterialActionControllerDeps) {
  async function saveTemplate(id: string | null, title: string, body: string) {
    const cleanTitle = title.trim();
    if (!cleanTitle) throw new Error('Введите название');
    const saved = await deps.repository.saveTemplate(id || null, cleanTitle, body, deps.context());
    await deps.reload();
    return saved;
  }

  async function deleteTemplate(id: string) {
    await deps.repository.deleteTemplate(id);
    await deps.reload();
  }

  async function createFolder(name: string) {
    const cleanName = name.trim();
    if (!cleanName) throw new Error('Введите название папки');
    const folder = await deps.repository.createFolder(cleanName, deps.context());
    await deps.reload();
    return folder;
  }

  async function renameFolder(id: string, name: string) {
    const cleanName = name.trim();
    if (!cleanName) throw new Error('Введите название папки');
    await deps.repository.renameFolder(id, cleanName);
    await deps.reload();
  }

  async function deleteFolder(id: string) {
    await deps.repository.deleteFolder(id);
    await deps.reload();
  }

  async function uploadFile(folderId: string | null, file: File, id: string) {
    const uploaded = await deps.repository.uploadFile(folderId, file, id, deps.context());
    await deps.reload();
    return uploaded;
  }

  async function deleteFile(file: MaterialFile) {
    await deps.repository.deleteFile(file, deps.context());
    await deps.reload();
  }

  async function signedUrl(storagePath: string, expiresIn = 600) {
    return deps.repository.signedUrl(storagePath, deps.context(), expiresIn);
  }

  return { saveTemplate, deleteTemplate, createFolder, renameFolder, deleteFolder, uploadFile, deleteFile, signedUrl };
}
