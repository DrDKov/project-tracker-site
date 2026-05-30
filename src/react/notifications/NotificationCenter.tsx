// @ts-nocheck
import React from 'react';
import { Button, EmptyState } from '../../shared/ui';
import {
  formatNotificationDate,
  getNotificationTitle,
  getNotificationTypeLabel,
  UNKNOWN_PROJECT_LABEL
} from './notificationModel.ts';

/** @typedef {Record<string, any>} NotificationItemRecord */

/**
 * @param {{ item: NotificationItemRecord, onOpen: (taskId: string) => void }} props
 */
function NotificationItem({ item, onOpen }) {
  const taskId = String(item.task_id || '');
  const author = item.author ? `от ${item.author} · ` : '';
  const project = item.project || UNKNOWN_PROJECT_LABEL;

  return (
    <button
      type="button"
      className={`assignment-item ${item.unread ? 'unread' : ''}`}
      data-assignment-open={taskId}
      onClick={() => onOpen(taskId)}
    >
      <div className="assignment-item-title">
        <span className="assignment-type">{getNotificationTypeLabel(item.type)}</span>
        {getNotificationTitle(item)}
      </div>
      <div>{item.title || 'Задача'}</div>
      <div className="assignment-item-meta">
        {`${project} · ${author}${formatNotificationDate(item.created_at)}`}
      </div>
    </button>
  );
}

/**
 * @param {{
 *   items: NotificationItemRecord[],
 *   onOpen: (taskId: string) => void,
 *   onMarkAllRead: () => void
 * }} props
 */
export function NotificationCenter({ items, onOpen, onMarkAllRead }) {
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <>
      <div className="assignment-panel-head">
        <b>Оповещения</b>
        <Button size="sm" variant="secondary" data-assignment-clear onClick={onMarkAllRead}>Прочитано</Button>
      </div>
      <div className="assignment-list" id="assignmentList">
        {!safeItems.length ? (
          <EmptyState title="Новых уведомлений пока нет" icon="🔔" />
        ) : (
          safeItems.map((item) => (
            <NotificationItem key={item.id || `${item.type}:${item.task_id}:${item.created_at}`} item={item} onOpen={onOpen} />
          ))
        )}
      </div>
    </>
  );
}
