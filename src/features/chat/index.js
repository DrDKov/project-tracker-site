// @ts-check
import { createWorkspaceRepositorySet } from '../../repositories/index.ts';
import { createChatActionController } from '../../controllers/chat/chatActions.ts';
import { createChatViewModel, parseChatBody } from '../../react/chat/chatModel.ts';
import { mountChatPage } from '../../react/chat/mountChatPage.tsx';

const BUCKET = 'project-chat-files';

/**
 * Integration adapter between the legacy runtime and the React ChatPage island.
 * React owns presentation; this adapter keeps Supabase, Storage and runtime state
 * mutations in the existing feature/service boundary.
 */
export function createChatFeature(deps) {
  const { S, $, dt, byId } = deps;

  function activeProjectId() {
    if (S.activeChat && (S.projects || []).some((project) => project.id === S.activeChat)) return S.activeChat;
    S.activeChat = S.projects?.[0]?.id || '';
    return S.activeChat;
  }

  function currentSearch() {
    const input = $('chatSearch');
    if (input && typeof input.value === 'string') return input.value;
    return S.chatSearch || '';
  }

  function currentFileCount() {
    const input = $('chatFiles');
    if (input && input.files) return input.files.length;
    return Number(S.chatSelectedFileCount || 0);
  }

  function renderChat() {
    const panel = document.querySelector('#chat .chat-panel');
    if (!panel) return;
    const projectId = activeProjectId();
    const model = createChatViewModel({
      projects: S.projects || [],
      messages: S.messages || [],
      users: S.users || [],
      profile: S.profile || null,
      activeProjectId: projectId,
      search: currentSearch(),
      selectedFileCount: currentFileCount(),
      dateTime: dt
    });
    S.activeChat = model.activeProjectId;
    mountChatPage(panel, model, {
      onProjectChange: (nextProjectId) => {
        S.activeChat = nextProjectId;
        renderChat();
      },
      onSearchChange: (value) => {
        S.chatSearch = value;
        renderChat();
      },
      onFileCountChange: (count) => {
        S.chatSelectedFileCount = count;
      },
      onClear: async () => {
        try { await clearChat(); }
        catch (error) { alert(error.message || error); }
      },
      onSend: async () => {
        try { await sendChat(); }
        catch (error) { alert(error.message || error); }
      },
      onDeleteMessage: async (messageId) => {
        try { await deleteMessage(messageId); }
        catch (error) { alert(error.message || error); }
      }
    });
  }

  function actions() {
    return createChatActionController({
      state: S,
      repository: createWorkspaceRepositorySet(S.sb).chat,
      bucket: BUCKET,
      currentUserId: () => S.profile?.id || S.user?.id || null,
      renderChat,
      confirmClear: (message) => confirm(message)
    });
  }

  async function uploadChatFiles(projectId) {
    const input = $('chatFiles');
    const files = [...(input?.files || [])];
    if (!files.length) return [];
    return createWorkspaceRepositorySet(S.sb).chat.uploadFiles(BUCKET, projectId, files);
  }

  async function sendChat() {
    const projectId = $('chatProject')?.value || S.activeChat;
    const text = ($('chatText')?.value || '').trim();
    if (!projectId) return;

    const input = $('chatFiles');
    const files = [...(input?.files || [])];
    const button = $('sendChatBtn');
    if (button) {
      button.disabled = true;
      button.textContent = '...';
    }

    try {
      const sent = await actions().sendMessage(projectId, text, files);
      if (!sent) return;
      if ($('chatText')) $('chatText').value = '';
      if (input) input.value = '';
      S.chatSelectedFileCount = 0;
      S.activeChat = projectId;
      renderChat();
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Отправить';
      }
    }
  }

  async function deleteMessage(id) {
    await actions().deleteMessage(id);
  }

  async function clearChat() {
    const projectId = $('chatProject')?.value || S.activeChat;
    await actions().clearProject(projectId);
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
  }

  function msgHtml(body) {
    const parsed = parseChatBody(body);
    return [
      ...parsed.textLines.map((line) => line.trim() ? `<div>${escapeHtml(line)}</div>` : '<br>'),
      ...parsed.attachments.map((file) => file.isImage
        ? `<a class="chat-img-link" href="${escapeHtml(file.url)}" target="_blank" rel="noopener"><img src="${escapeHtml(file.url)}" alt="${escapeHtml(file.name)}"><span>${escapeHtml(file.name)}</span></a>`
        : `<a class="chat-file-link" href="${escapeHtml(file.url)}" target="_blank" rel="noopener">📎 <span>${escapeHtml(file.name)}</span></a>`)
    ].join('');
  }

  return {
    renderChat,
    uploadChatFiles,
    sendChat,
    deleteMessage,
    clearChat,
    msgHtml,
    ensureChatTools: renderChat,
    ensureChatComposer: renderChat
  };
}
