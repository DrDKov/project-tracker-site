import assert from 'node:assert/strict';
import {
  createTaskCardViewModel,
  createTaskCardRootStyle,
  isTaskCardFavorite
} from '../../src/react/tasks/taskCardModel.ts';

const task = {
  id: 't1',
  project_id: 'p1',
  title: 'Подготовить документы',
  status: 'in_progress',
  priority: 'high',
  start_date: '2026-05-29',
  due_date: '2026-05-30',
  notes: 'Есть описание',
  is_favorite: true,
  recurrence_rule_id: 'r1',
  updated_at: '2026-05-29T10:00:00Z'
};

const deps = {
  fmt: (value) => value || '—',
  dt: (value) => value || '—',
  rgba: (hex, alpha) => `${hex}:${alpha}`,
  pcolor: () => '#2563eb',
  pname: () => 'Салым',
  uname: (id) => id === 'u1' ? 'Иван' : 'Пользователь',
  tids: () => ['u1'],
  subs: () => [
    { id: 's1', task_id: 't1', title: 'Первый шаг', is_done: true },
    { id: 's2', task_id: 't1', title: 'Второй шаг', is_done: false }
  ],
  today: () => '2026-05-31',
  PR: { high: 'Высокий' },
  ST: { in_progress: 'В работе' },
  taskCommentList: () => [{ id: 'c1' }, { id: 'c2' }]
};

const model = createTaskCardViewModel(task, deps, { showStatus: true });

assert.equal(model.id, 't1');
assert.equal(model.title, 'Подготовить документы');
assert.equal(model.projectName, 'Салым');
assert.equal(model.priorityLabel, 'Высокий');
assert.equal(model.statusLabel, 'В работе');
assert.equal(model.showStatus, true);
assert.equal(model.isFavorite, true);
assert.equal(model.isRecurring, true);
assert.equal(model.isOverdue, true);
assert.equal(model.subtasks.total, 2);
assert.equal(model.subtasks.done, 1);
assert.equal(model.subtasks.percent, 50);
assert.equal(model.commentCount, 2);
assert.equal(model.assigneesLabel, 'Иван');
assert.equal(isTaskCardFavorite(task), true);
assert.match(createTaskCardRootStyle(model), /--accent:#2563eb/);

console.log('task card model tests passed');
