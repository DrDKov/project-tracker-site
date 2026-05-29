// @ts-check
import {
  currentProfile,
  projectList,
  taskList
} from '../../core/workspace-context.js';

const STORE_PREFIX = 'pt_assignment_notifications_v1:';
const UNKNOWN_PROJECT_LABEL = 'Проект не указан';

function storeKey() {
  const profile = currentProfile();
  return STORE_PREFIX + ((profile && profile.id) || 'anonymous');
}

function tasks() {
  const list = taskList();
  return Array.isArray(list) ? list : [];
}

function projects() {
  const list = projectList();
  return Array.isArray(list) ? list : [];
}

function taskById(taskId) {
  return tasks().find((task) => task && String(task.id) === String(taskId)) || null;
}

function projectById(projectId) {
  return projects().find((project) => project && String(project.id) === String(projectId)) || null;
}

function projectNameForTask(taskId) {
  const task = taskById(taskId);
  if (!task) return '';

  const directName = task.project_name || (task.project && task.project.name) || (task.projects && task.projects.name);
  if (directName) return String(directName);

  const projectId = task.project_id || task.projectId;
  if (!projectId) return '';

  const project = projectById(projectId);
  return project ? String(project.name || '') : '';
}

function readStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(storeKey()) || '{}');
    return Array.isArray(raw.items) ? raw.items : [];
  } catch (error) {
    return [];
  }
}

function writeStore(items) {
  try {
    localStorage.setItem(storeKey(), JSON.stringify({ items: items.slice(0, 40) }));
  } catch (error) {}
}

function normalizeStoredProjects() {
  const items = readStore();
  if (!items.length) return false;

  let changed = false;
  for (const item of items) {
    if (!item || !item.task_id) continue;
    const name = projectNameForTask(item.task_id);
    if (!name) continue;

    if (!item.project || item.project === UNKNOWN_PROJECT_LABEL) {
      item.project = name;
      const task = taskById(item.task_id);
      if (task && task.project_id) item.project_id = task.project_id;
      changed = true;
    }
  }

  if (changed) writeStore(items);
  return changed;
}

function patchVisiblePanel() {
  const list = document.getElementById('assignmentList');
  if (!list) return;

  list.querySelectorAll('[data-assignment-open]').forEach((button) => {
    const taskId = button.getAttribute('data-assignment-open');
    const projectName = projectNameForTask(taskId);
    if (!projectName) return;

    const meta = button.querySelector('.assignment-item-meta');
    if (!meta || !meta.textContent) return;

    if (meta.textContent.startsWith(UNKNOWN_PROJECT_LABEL)) {
      meta.textContent = meta.textContent.replace(UNKNOWN_PROJECT_LABEL, projectName);
    }
  });
}

function syncNotificationProjectLabels() {
  normalizeStoredProjects();
  patchVisiblePanel();
}

function boot() {
  syncNotificationProjectLabels();
  setInterval(syncNotificationProjectLabels, 1500);

  const list = document.getElementById('assignmentList');
  if (list && window.MutationObserver) {
    const observer = new MutationObserver(() => patchVisiblePanel());
    observer.observe(list, { childList: true, subtree: true });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
