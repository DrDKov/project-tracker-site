# React Stage 10 — ChatPage

`ChatPage` is a React island for the project chat presentation layer.

Boundary:

- React owns project selector rendering, search, message list, attachments, empty state and composer UI.
- The existing chat feature adapter still owns integration with the legacy runtime, Supabase services, Storage uploads and mutation callbacks.
- The component preserves legacy DOM contracts: `chatProject`, `chatSearch`, `chatMessages`, `chatText`, `chatFiles`, `sendChatBtn`, `chatFileSummary` and `data-action="delete-chat-message"`.
- React components do not call Supabase directly.
