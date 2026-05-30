import assert from 'node:assert/strict';
import {
  createProjectCardViewModel,
  createProjectsPageViewModel,
  matchesProjectFilters,
  projectOwnerName,
  projectTaskStats
} from '../../src/react/projects/projectModel.ts';

const users = [
  { id: 'u1', display_name: 'Иван' },
  { id: 'u2', email: 'maria@example.com' }
];

const projects = [
  { id: 'p1', name: 'Салым', description: 'Основной проект', owner_id: 'u1', status: 'in_progress', priority: 'high', color: '#2563eb', start_date: '2026-06-01', deadline: '2026-06-30', next_step: 'Проверить задачи' },
  { id: 'p2', name: 'Архив', owner_id: 'u2', status: 'planned', priority: 'low', deleted_at: null },
  { id: 'p3', name: 'Удалённый', owner_id: 'u1', status: 'planned', priority: 'low', deleted_at: '2026-06-10' }
];

const tasks = [
  { id: 't1', project_id: 'p1', status: 'done', title: 'Готово' },
  { id: 't2', project_id: 'p1', status: 'planned', title: 'В работе' },
  { id: 't3', project_id: 'p2', status: 'done', title: 'Архив' }
];

const base = {
  projects,
  tasks,
  users,
  filters: { query: '', statuses: ['all'], ownerIds: ['all'] },
  statusLabels: { in_progress: 'В работе', planned: 'Запланировано' },
  priorityLabels: { high: 'Высокий', low: 'Низкий' },
  fmt: (value) => value || '—',
  rgba: (hex, alpha) => `${hex}:${alpha}`
};

assert.equal(projectOwnerName(users, 'u1'), 'Иван');
assert.equal(projectOwnerName(users, 'u2'), 'maria@example.com');
assert.deepEqual(projectTaskStats(tasks, 'p1'), { total: 2, done: 1, progress: 50 });

const card = createProjectCardViewModel(projects[0], base);
assert.equal(card.name, 'Салым');
assert.equal(card.statusLabel, 'В работе');
assert.equal(card.priorityLabel, 'Высокий');
assert.equal(card.progress, 50);
assert.equal(card.ownerName, 'Иван');
assert.equal(card.rootStyle['--project-color'], '#2563eb');

assert.equal(matchesProjectFilters(projects[0], { query: 'салым', statuses: ['all'], ownerIds: ['all'] }), true);
assert.equal(matchesProjectFilters(projects[0], { query: '', statuses: ['planned'], ownerIds: ['all'] }), false);
assert.equal(matchesProjectFilters(projects[2], { query: '', statuses: ['all'], ownerIds: ['all'] }), false);

const page = createProjectsPageViewModel({ ...base, filters: { query: '', statuses: ['all'], ownerIds: ['all'] } });
assert.equal(page.total, 2);
assert.equal(page.visible, 2);
assert.equal(page.projects[0].name, 'Архив');
assert.equal(page.projects[1].name, 'Салым');

const filtered = createProjectsPageViewModel({ ...base, filters: { query: 'салым', statuses: ['all'], ownerIds: ['all'] } });
assert.equal(filtered.visible, 1);
assert.equal(filtered.projects[0].id, 'p1');

console.log('project model tests passed');
