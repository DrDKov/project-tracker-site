// @ts-nocheck
import React from 'react';
import { renderReactIsland } from '../core/createReactIsland.tsx';
import { ChatPage } from './ChatPage.tsx';

/**
 * @param {HTMLElement | null} container
 * @param {import('./chatModel.ts').createChatViewModel extends (...args: any) => infer R ? R : never} model
 * @param {{
 *   onProjectChange: (projectId: string) => void,
 *   onSearchChange: (value: string) => void,
 *   onClear: () => Promise<void> | void,
 *   onSend: () => Promise<void> | void,
 *   onFileCountChange: (count: number) => void,
 *   onDeleteMessage?: (messageId: string) => Promise<void> | void
 * }} actions
 */
export function mountChatPage(container, model, actions) {
  return renderReactIsland(container, <ChatPage model={model} {...actions} />);
}
