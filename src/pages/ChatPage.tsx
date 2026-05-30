import React from 'react';
import { useWorkspaceState } from '../react/state/useWorkspaceStore';
import { useWorkspaceUiStore } from '../shared/store/uiStore';
import { createWorkspaceReactActions } from '../react/actions/workspaceActions';
import { createChatViewModel } from '../react/chat/chatModel';
import { ChatPage as ChatPageView } from '../react/chat/ChatPage';
import { dt } from './pageUtils';

export function ChatPage() {
  const state = useWorkspaceState();
  const ui = useWorkspaceUiStore();
  const [activeProjectId, setActiveProjectId] = React.useState(state.projects?.[0]?.id || '');
  const [fileCount, setFileCount] = React.useState(0);
  const actions = React.useMemo(() => createWorkspaceReactActions(), [state.sb, state.profile?.id]);
  React.useEffect(() => {
    if (!activeProjectId && state.projects?.[0]?.id) setActiveProjectId(state.projects[0].id);
  }, [state.projects, activeProjectId]);
  const model = createChatViewModel({ projects: state.projects || [], messages: state.messages || [], users: state.users || [], profile: state.profile || null, activeProjectId, search: ui.filters.chatSearch, selectedFileCount: fileCount, dateTime: dt });
  return <section className="panel react-chat-page"><ChatPageView model={model} onProjectChange={setActiveProjectId} onSearchChange={(value) => ui.setFilter('chatSearch', value)} onClear={() => undefined} onSend={() => undefined} onFileCountChange={setFileCount} onDeleteMessage={(id) => actions.deleteChatMessage?.(id)} /></section>;
}
export default ChatPage;
