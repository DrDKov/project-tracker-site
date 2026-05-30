import type { ProjectMessage } from '../../types/entities';
import type { SupabaseClientLike } from '../../types/supabase';
import { assertRepositoryClient, repositoryCall } from '../repositoryError';
import {
  clearProjectMessages,
  createProjectMessage,
  deleteProjectMessage,
  uploadProjectChatFiles
} from '../../services/chat.service.js';

export interface ChatAttachmentUpload {
  name: string;
  url: string;
  type?: string;
  isImage?: boolean;
}

export interface ChatMessageInput {
  project_id: string;
  body: string;
  author_id?: string | null;
}

export interface ChatRepository {
  uploadFiles(bucket: string, projectId: string, files: File[]): Promise<ChatAttachmentUpload[]>;
  createMessage(row: ChatMessageInput): Promise<ProjectMessage>;
  deleteMessage(id: string): Promise<unknown>;
  clearProject(projectId: string): Promise<unknown>;
}

const DOMAIN = 'chat';

export function createChatRepository(client: SupabaseClientLike): ChatRepository {
  assertRepositoryClient(client, DOMAIN);
  return {
    uploadFiles: (bucket, projectId, files) => repositoryCall(DOMAIN, 'uploadFiles', () => uploadProjectChatFiles(client, bucket, projectId, files) as Promise<ChatAttachmentUpload[]>),
    createMessage: (row) => repositoryCall(DOMAIN, 'createMessage', () => createProjectMessage(client, row) as Promise<ProjectMessage>),
    deleteMessage: (id) => repositoryCall(DOMAIN, 'deleteMessage', () => deleteProjectMessage(client, id)),
    clearProject: (projectId) => repositoryCall(DOMAIN, 'clearProject', () => clearProjectMessages(client, projectId))
  };
}
