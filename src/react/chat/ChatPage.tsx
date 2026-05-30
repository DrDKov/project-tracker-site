// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';

/** @typedef {import('./chatModel.ts').createChatViewModel extends (...args: any) => infer R ? R : never} ChatViewModel */

function MessageText({ lines }) {
  if (!lines.length) return null;
  return (
    <div className="chat-message-text">
      {lines.map((line, index) => (
        line.trim()
          ? <div key={index}>{line}</div>
          : <br key={index} />
      ))}
    </div>
  );
}

function MessageAttachments({ attachments }) {
  if (!attachments.length) return null;
  return (
    <div className="chat-attachments">
      {attachments.map((file, index) => (
        file.isImage ? (
          <a className="chat-img-link" href={file.url} target="_blank" rel="noopener noreferrer" key={`${file.url}-${index}`}>
            <img src={file.url} alt={file.name} loading="lazy" />
            <span>{file.name}</span>
          </a>
        ) : (
          <a className="chat-file-link" href={file.url} target="_blank" rel="noopener noreferrer" key={`${file.url}-${index}`}>
            <span aria-hidden="true">📎</span>
            <span>{file.name}</span>
          </a>
        )
      ))}
    </div>
  );
}

function ChatMessage({ message, onDelete }) {
  return (
    <div className={`chat-bubble ${message.mine ? 'mine' : ''}`} data-message-id={message.id}>
      <button className="chat-x" title="Удалить сообщение" type="button" onClick={() => onDelete?.(message.id)}>×</button>
      <div className="chat-meta">{message.authorLabel} · {message.createdLabel}</div>
      <MessageText lines={message.textLines} />
      <MessageAttachments attachments={message.attachments} />
    </div>
  );
}

/**
 * @param {{
 *   model: ChatViewModel,
 *   onProjectChange: (projectId: string) => void,
 *   onSearchChange: (value: string) => void,
 *   onClear: () => Promise<void> | void,
 *   onSend: () => Promise<void> | void,
 *   onFileCountChange: (count: number) => void,
 *   onDeleteMessage?: (messageId: string) => Promise<void> | void
 * }} props
 */
export function ChatPage({ model, onProjectChange, onSearchChange, onClear, onSend, onFileCountChange, onDeleteMessage }) {
  const messagesRef = useRef(null);
  const fileInputRef = useRef(null);
  const [sending, setSending] = useState(false);
  const [fileCount, setFileCount] = useState(model.selectedFileCount || 0);

  useEffect(() => {
    const node = messagesRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [model.messages.length, model.activeProjectId]);

  useEffect(() => {
    setFileCount(model.selectedFileCount || 0);
  }, [model.selectedFileCount]);

  async function handleSend() {
    if (sending) return;
    setSending(true);
    try {
      await onSend();
      setFileCount(0);
      onFileCountChange(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setSending(false);
    }
  }

  function handleFileChange(event) {
    const count = event.currentTarget.files?.length || 0;
    setFileCount(count);
    onFileCountChange(count);
  }

  return (
    <div className="chat-react-page">
      <div className="panel-head chat-react-head">
        <div>
          <h3>Проектные чаты</h3>
          <p className="muted">Обсуждение проекта, текстовые сообщения, файлы и изображения</p>
        </div>
        <select
          className="input"
          id="chatProject"
          value={model.activeProjectId}
          onChange={(event) => onProjectChange(event.currentTarget.value)}
          disabled={!model.projectOptions.length}
        >
          {model.projectOptions.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
      </div>

      <div className="chat-tools">
        <input
          className="input"
          id="chatSearch"
          placeholder="Поиск по чату"
          value={model.search}
          onChange={(event) => onSearchChange(event.currentTarget.value)}
        />
        <button className="btn secondary" id="clearChatBtn" type="button" onClick={() => onClear()}>Очистить чат</button>
      </div>

      <div className="chat-layout">
        <div className="chat-messages" id="chatMessages" ref={messagesRef}>
          {model.messages.length ? model.messages.map((message) => (
            <ChatMessage key={message.id} message={message} onDelete={onDeleteMessage} />
          )) : <div className="empty">{model.emptyText}</div>}
        </div>

        <div className="chat-compose wk-compact">
          <label className="chat-file-btn" htmlFor="chatFiles" title="Прикрепить файл или изображение">+</label>
          <textarea className="input textarea" id="chatText" placeholder="Напишите сообщение по проекту..." />
          <input className="input" id="chatFiles" multiple type="file" ref={fileInputRef} onChange={handleFileChange} />
          <button className="btn primary chat-send" id="sendChatBtn" type="button" onClick={handleSend} disabled={sending || !model.activeProjectId}>
            {sending ? '...' : 'Отправить'}
          </button>
          <div className="chat-file-summary" id="chatFileSummary">
            {fileCount ? `Выбрано файлов: ${fileCount}` : model.hintText}
          </div>
        </div>
      </div>
    </div>
  );
}
