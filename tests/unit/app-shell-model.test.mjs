import assert from 'node:assert/strict';
import {
  createAppShellMetrics,
  createAppShellModel,
  createVisibleAppPages,
  getAppShellPage
} from '../../src/react/app-shell/appShellModel.ts';

const state = {
  view: 'tasks',
  projects: [{ id: 'p1' }, { id: 'p2' }],
  tasks: [
    { id: 't1', status: 'planned', due_date: '2026-05-01' },
    { id: 't2', status: 'done', due_date: '2026-05-01' },
    { id: 't3', status: 'in_progress', due_date: '2026-06-01' }
  ],
  users: [{ id: 'u1' }]
};

assert.deepEqual(createAppShellMetrics(state, '2026-05-30'), {
  projects: 2,
  openTasks: 2,
  overdueTasks: 1,
  users: 1
});

assert.equal(getAppShellPage('projects').label, 'Проекты');
assert.equal(getAppShellPage('unknown').id, 'overview');

assert.equal(createVisibleAppPages({ canViewAudit: false, canViewMaterials: false }, { hasMaterialsSection: true }).some((page) => page.id === 'audit'), false);
assert.equal(createVisibleAppPages({ canViewAudit: true, canViewMaterials: true }, { hasMaterialsSection: true }).some((page) => page.id === 'materials'), true);
assert.equal(createVisibleAppPages({ canViewAudit: true, canViewMaterials: true }, { hasMaterialsSection: false }).some((page) => page.id === 'materials'), false);

const model = createAppShellModel({
  state,
  permissions: { canViewAudit: true, canViewMaterials: false },
  today: '2026-05-30',
  statusTitle: 'Подключено',
  statusText: 'Realtime: подключён'
});

assert.equal(model.view, 'tasks');
assert.equal(model.title, 'Задачи');
assert.equal(model.statusTitle, 'Подключено');
assert.equal(model.statusText, 'Realtime: подключён');
assert.equal(model.metrics.openTasks, 2);
assert.equal(model.pages.some((page) => page.id === 'audit'), true);
assert.equal(model.pages.some((page) => page.id === 'materials'), false);

const hiddenView = createAppShellModel({
  state: { ...state, view: 'audit' },
  permissions: { canViewAudit: false, canViewMaterials: false },
  today: '2026-05-30'
});
assert.equal(hiddenView.view, 'overview');
assert.equal(hiddenView.title, 'Обзор');

console.log('app-shell model tests passed');
