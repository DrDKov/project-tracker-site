// @ts-nocheck
import React from 'react';
import { renderReactIsland } from '../core/createReactIsland.tsx';
import { NotificationCenter } from './NotificationCenter.tsx';

/**
 * @param {HTMLElement | null} container
 * @param {{items: Array<Record<string, any>>, onOpen: (taskId: string) => void, onMarkAllRead: () => void}} props
 */
export function mountNotificationCenter(container, props) {
  return renderReactIsland(container, <NotificationCenter {...props} />);
}
