import type { AppUser, MaterialFile, MaterialFolder, MaterialTemplate } from '../../types/entities';
import type { SupabaseClientLike } from '../../types/supabase';
import { assertRepositoryClient, repositoryCall } from '../repositoryError';
import {
  createFolder,
  createMaterialSignedUrl,
  deleteMaterialFile,
  fetchMaterialProfileByCurrentUser,
  fetchMaterialsBundle,
  renameFolder,
  saveTemplate,
  softDeleteFolder,
  softDeleteTemplate,
  uploadMaterialFile
} from '../../services/materials.service.js';

export interface MaterialsBundle {
  templates: MaterialTemplate[];
  folders: MaterialFolder[];
  files: MaterialFile[];
}

export interface MaterialRepositoryContext {
  workspaceId: string;
  currentUserId: string | null;
  bucket: string;
}

export interface MaterialRepository {
  currentProfile(): Promise<AppUser | null>;
  bundle(): Promise<MaterialsBundle>;
  saveTemplate(id: string | null, title: string, body: string, context: MaterialRepositoryContext): Promise<MaterialTemplate>;
  deleteTemplate(id: string): Promise<unknown>;
  createFolder(name: string, context: MaterialRepositoryContext): Promise<MaterialFolder>;
  renameFolder(id: string, name: string): Promise<unknown>;
  deleteFolder(id: string): Promise<unknown>;
  uploadFile(folderId: string | null, file: File, id: string, context: MaterialRepositoryContext): Promise<MaterialFile>;
  deleteFile(file: MaterialFile, context: Pick<MaterialRepositoryContext, 'bucket'>): Promise<unknown>;
  signedUrl(storagePath: string, context: Pick<MaterialRepositoryContext, 'bucket'>, expiresIn?: number): Promise<string>;
}

const DOMAIN = 'materials';

export function createMaterialRepository(client: SupabaseClientLike): MaterialRepository {
  assertRepositoryClient(client, DOMAIN);
  return {
    currentProfile: () => repositoryCall(DOMAIN, 'currentProfile', () => fetchMaterialProfileByCurrentUser(client) as Promise<AppUser | null>),
    bundle: () => repositoryCall(DOMAIN, 'bundle', () => fetchMaterialsBundle(client) as Promise<MaterialsBundle>),
    saveTemplate: (id, title, body, context) => repositoryCall(DOMAIN, 'saveTemplate', () => saveTemplate(client, context.workspaceId, context.currentUserId, id, title, body) as Promise<MaterialTemplate>),
    deleteTemplate: (id) => repositoryCall(DOMAIN, 'deleteTemplate', () => softDeleteTemplate(client, id)),
    createFolder: (name, context) => repositoryCall(DOMAIN, 'createFolder', () => createFolder(client, context.workspaceId, context.currentUserId, name) as Promise<MaterialFolder>),
    renameFolder: (id, name) => repositoryCall(DOMAIN, 'renameFolder', () => renameFolder(client, id, name)),
    deleteFolder: (id) => repositoryCall(DOMAIN, 'deleteFolder', () => softDeleteFolder(client, id)),
    uploadFile: (folderId, file, id, context) => repositoryCall(DOMAIN, 'uploadFile', () => uploadMaterialFile(client, context.bucket, context.workspaceId, folderId, context.currentUserId, file, id, file.name) as Promise<MaterialFile>),
    deleteFile: (file, context) => repositoryCall(DOMAIN, 'deleteFile', () => deleteMaterialFile(client, context.bucket, file)),
    signedUrl: (storagePath, context, expiresIn = 600) => repositoryCall(DOMAIN, 'signedUrl', () => createMaterialSignedUrl(client, context.bucket, storagePath, expiresIn) as Promise<string>)
  };
}
