import assert from 'node:assert/strict';
import {
  createNotificationItem,
  normalizeNotificationItems,
  prependNotificationItem,
  UNKNOWN_PROJECT_LABEL,
  unreadNotificationCount
} from '../../src/react/notifications/notificationModel.ts';

const projects = [{ id: 'p1', name: 'Салым' }];
const tasks = [{ id: 't1', title: 'Подготовить документы', project_id: 'p1' }];
const context = { projects, tasks };

const created = createNotificationItem('assignment', tasks[0], {}, context);
assert.equal(created.project, 'Салым');
assert.equal(created.project_id, 'p1');
assert.equal(created.type, 'assignment');
assert.equal(created.unread, true);

const old = [{ id: 'old:t1', type: 'assignment', task_id: 't1', title: 'Старый заголовок', project: UNKNOWN_PROJECT_LABEL, unread: true }];
const normalized = normalizeNotificationItems(old, context, 40);
assert.equal(normalized[0].project, 'Салым');
assert.equal(normalized[0].project_id, 'p1');
assert.equal(normalized[0].title, 'Старый заголовок');
assert.equal(unreadNotificationCount(normalized), 1);

const duplicateAssignment = prependNotificationItem(normalized, created, 40);
assert.equal(duplicateAssignment.filter((item) => item.type === 'assignment' && item.task_id === 't1').length, 1);

console.log('notification model tests passed');
