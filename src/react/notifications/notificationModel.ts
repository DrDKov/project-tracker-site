// @ts-nocheck

export const UNKNOWN_PROJECT_LABEL = 'Проект не указан';

/**
 * @typedef {Object} NotificationContext
 * @property {Array<Record<string, any>>=} tasks
 * @property {Array<Record<string, any>>=} projects
 */

/**
 * @param {string} prefix
 * @param {string | null | undefined} profileId
 */
export function notificationStoreKey(prefix, profileId) {
  return `${prefix}${profileId || 'anonymous'}`;
}

/** @param {unknown} value */
export function formatNotificationDate(value) {
  try {
    return value ? new Date(/** @type {string | number | Date} */ (value)).toLocaleString('ru-RU') : new Date().toLocaleString('ru-RU');
  } catch {
    return '';
  }
}

/** @param {string | undefined | null} type */
export function getNotificationTypeLabel(type) {
  if (type === 'mention') return 'Упоминание';
  if (type === 'task_updated') return 'Изменение';
  return 'Назначение';
}

/** @param {{type?: string}=} item */
export function getNotificationTitle(item = {}) {
  if (item.type === 'mention') return 'Вас упомянули в комментарии';
  if (item.type === 'task_updated') return 'Ваша задача изменена';
  return 'Вам назначили задачу';
}

/**
 * @param {string | null | undefined} taskId
 * @param {NotificationContext} context
 */
export function findTask(taskId, context = {}) {
  if (!taskId) return null;
  return (context.tasks || []).find((task) => task && String(task.id) === String(taskId)) || null;
}

/**
 * @param {string | null | undefined} projectId
 * @param {NotificationContext} context
 */
export function findProject(projectId, context = {}) {
  if (!projectId) return null;
  return (context.projects || []).find((project) => project && String(project.id) === String(projectId)) || null;
}

/**
 * @param {Record<string, any> | null | undefined} task
 * @param {NotificationContext} context
 */
export function resolveProjectMeta(task, context = {}) {
  const projectId = task && (task.project_id || task.projectId || task.project?.id || task.projects?.id || null);
  const directName = task && (task.project_name || task.project?.name || task.projects?.name || null);
  const project = projectId ? findProject(projectId, context) : null;
  const name = directName || (project && project.name) || UNKNOWN_PROJECT_LABEL;
  return { project_id: projectId || null, project: String(name || UNKNOWN_PROJECT_LABEL) };
}

/**
 * @param {Record<string, any>} item
 * @param {NotificationContext} context
 * @returns {Record<string, any>}
 */
export function normalizeNotificationItem(item, context = {}) {
  const task = findTask(item.task_id, context);
  const meta = resolveProjectMeta(task || item, context);
  const shouldReplaceProject = !item.project || item.project === UNKNOWN_PROJECT_LABEL;
  return {
    ...item,
    type: item.type || 'assignment',
    title: item.title || (task && task.title) || 'Задача',
    project_id: item.project_id || meta.project_id || null,
    project: shouldReplaceProject ? meta.project : item.project,
    created_at: item.created_at || new Date().toISOString(),
    unread: Boolean(item.unread)
  };
}

/**
 * @param {unknown} items
 * @param {NotificationContext} context
 * @param {number} maxItems
 * @returns {Array<Record<string, any>>}
 */
export function normalizeNotificationItems(items, context = {}, maxItems = 40) {
  const list = Array.isArray(items) ? items : [];
  const seen = new Set();
  const normalized = [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const item = normalizeNotificationItem(/** @type {Record<string, any>} */ (raw), context);
    const key = item.id || `${item.type}:${item.task_id}:${item.created_at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({ ...item, id: key });
    if (normalized.length >= maxItems) break;
  }
  return normalized;
}

/** @param {Array<Record<string, any>>} items */
export function unreadNotificationCount(items) {
  return (Array.isArray(items) ? items : []).filter((item) => item && item.unread).length;
}

/**
 * @param {Storage} storage
 * @param {string} key
 */
export function readNotificationStore(storage, key) {
  try {
    const raw = JSON.parse(storage.getItem(key) || '{}');
    return Array.isArray(raw.items) ? raw.items : [];
  } catch {
    return [];
  }
}

/**
 * @param {Storage} storage
 * @param {string} key
 * @param {Array<Record<string, any>>} items
 * @param {number} maxItems
 */
export function writeNotificationStore(storage, key, items, maxItems = 40) {
  try {
    storage.setItem(key, JSON.stringify({ items: (items || []).slice(0, maxItems) }));
  } catch {}
}

/**
 * @param {string} type
 * @param {Record<string, any>} task
 * @param {Record<string, any>} [extra]
 * @param {NotificationContext} [context]
 * @returns {Record<string, any>}
 */
export function createNotificationItem(type, task, extra = {}, context = {}) {
  const now = new Date().toISOString();
  const itemType = type || 'assignment';
  const id = itemType === 'mention'
    ? `mention:${extra.comment_id || Date.now()}:${task.id}`
    : itemType === 'task_updated'
      ? `task_updated:${task.id}:${extra.updated_at || Date.now()}`
      : `assignment:${task.id}`;
  const meta = resolveProjectMeta(task, context);
  return {
    id,
    type: itemType,
    task_id: task.id,
    title: task.title || 'Задача',
    project_id: meta.project_id,
    project: meta.project,
    author: extra.author || '',
    comment_id: extra.comment_id || '',
    created_at: now,
    unread: true
  };
}

/**
 * @param {Array<Record<string, any>>} items
 * @param {Record<string, any>} item
 * @param {number} maxItems
 */
export function prependNotificationItem(items, item, maxItems = 40) {
  const next = (items || []).filter((existing) => {
    if (!existing) return false;
    if (existing.id === item.id) return false;
    if (item.type === 'assignment' && existing.type === 'assignment' && existing.task_id === item.task_id) return false;
    return true;
  });
  next.unshift(item);
  return next.slice(0, maxItems);
}

/**
 * @param {Array<Record<string, any>>} left
 * @param {Array<Record<string, any>>} right
 */
export function notificationListsEqual(left, right) {
  try { return JSON.stringify(left || []) === JSON.stringify(right || []); }
  catch { return false; }
}
