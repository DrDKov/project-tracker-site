import type { AppState, ProjectMessage } from '../../types/entities';
import type { ChatRepository } from '../../repositories';

export interface ChatActionControllerDeps {
  state: AppState;
  repository: ChatRepository;
  bucket: string;
  currentUserId: () => string | null | undefined;
  renderChat: () => void;
  confirmClear?: (message: string) => boolean;
}

export function createChatActionController(deps: ChatActionControllerDeps) {
  async function sendMessage(projectId: string, text: string, files: File[] = []) {
    if (!projectId) return null;
    const cleanText = text.trim();
    const uploaded = files.length ? await deps.repository.uploadFiles(deps.bucket, projectId, files) : [];
    const fileLines = uploaded.map((file) => `${file.isImage ? '🖼' : '📎'} ${file.name}: ${file.url}`);
    const body = [cleanText, fileLines.join('\n')].filter(Boolean).join('\n\n');
    if (!body) return null;

    const row = await deps.repository.createMessage({
      project_id: projectId,
      body,
      author_id: deps.currentUserId() || null
    });
    deps.state.messages = [...(deps.state.messages || []), row as ProjectMessage];
    deps.state.activeChat = projectId;
    deps.renderChat();
    return row;
  }

  async function deleteMessage(id: string) {
    const message = (deps.state.messages || []).find((item) => item.id === id);
    if (message) message.deleted_at = new Date().toISOString();
    deps.renderChat();
    await deps.repository.deleteMessage(id);
  }

  async function clearProject(projectId: string) {
    if (!projectId) return false;
    if (deps.confirmClear && !deps.confirmClear('Очистить сообщения выбранного чата?')) return false;
    (deps.state.messages || []).forEach((message) => {
      if (message.project_id === projectId) message.deleted_at = new Date().toISOString();
    });
    deps.renderChat();
    await deps.repository.clearProject(projectId);
    return true;
  }

  return { sendMessage, deleteMessage, clearProject };
}
