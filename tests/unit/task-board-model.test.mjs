import assert from 'node:assert/strict';
import {
  createTaskBoardViewModel,
  getWeekStart,
  isTaskActiveOnDate,
  matchesDateFilter,
  normalizeTaskBoardMode
} from '../../src/react/tasks/taskBoardModel.ts';

const tasks = [
  { id: 't1', project_id: 'p1', title: 'Актуальная задача', status: 'planned', priority: 'high', start_date: '2026-06-01', due_date: '2026-06-03', assignee_id: 'u1', sort_order: 2 },
  { id: 't2', project_id: 'p1', title: 'Завершенная задача', status: 'done', priority: 'low', start_date: '2026-06-02', due_date: '2026-06-02', assignee_id: 'u2', sort_order: 1 },
  { id: 't3', project_id: 'p2', title: 'Без исполнителя', status: 'in_progress', priority: 'medium', due_date: '2026-06-04', sort_order: 3 }
];

const baseOptions = {
  tasks,
  users: [
    { id: 'u1', display_name: 'Иван' },
    { id: 'u2', display_name: 'Мария' }
  ],
  mode: 'status',
  showDone: false,
  filters: { query: '', projectIds: ['all'], userIds: ['all'], dateMode: 'all', dateFrom: '', dateTo: '' },
  weekStart: '2026-06-01',
  statusColumns: ['planned', 'in_progress', 'done'],
  statusLabels: { planned: 'Запланировано', in_progress: 'В работе', done: 'Завершено' },
  today: () => '2026-06-05',
  D: (value) => new Date(`${typeof value === 'string' ? value : value.toISOString().slice(0, 10)}T00:00:00`),
  add: (date, days) => {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  },
  taskUserIds: (task) => task.assignee_id ? [task.assignee_id] : [],
  taskCard: (task, options = {}) => ({ id: task.id, title: task.title, showStatus: Boolean(options.showStatus), rootClassName: 'task-card', rootStyle: {}, subtasks: { items: [], done: 0, total: 0, percent: 0 }, doneMeta: { visible: false, date: '', user: '' }, commentCount: 0 })
};

assert.equal(normalizeTaskBoardMode('bad'), 'status');
assert.equal(getWeekStart(baseOptions.D, '2026-06-03'), '2026-06-01');
assert.equal(isTaskActiveOnDate(tasks[0], '2026-06-02'), true);
assert.equal(matchesDateFilter(tasks[0], { dateMode: 'overdue' }, '2026-06-05'), true);

const statusModel = createTaskBoardViewModel(baseOptions);
assert.equal(statusModel.mode, 'status');
assert.equal(statusModel.columns.length, 3);
assert.equal(statusModel.columns.find((column) => column.id === 'done').cards.length, 0, 'done tasks are hidden when showDone=false');
assert.equal(statusModel.columns.find((column) => column.id === 'planned').cards[0].id, 't1');

const assigneeModel = createTaskBoardViewModel({ ...baseOptions, mode: 'assignee', showDone: true });
assert.equal(assigneeModel.mode, 'assignee');
assert.equal(assigneeModel.columns.find((column) => column.id === 'u1').cards.length, 1);
assert.equal(assigneeModel.columns.find((column) => column.id === '__none__').cards[0].id, 't3');
assert.equal(assigneeModel.columns.find((column) => column.id === 'u1').cards[0].showStatus, true);

const weekModel = createTaskBoardViewModel({ ...baseOptions, mode: 'week', showDone: true });
assert.equal(weekModel.mode, 'week');
assert.equal(weekModel.weekLabel, 'Неделя 01.06–07.06');
assert.ok(weekModel.columns.find((column) => column.id === '2026-06-02').cards.some((card) => card.id === 't1'));
assert.ok(weekModel.columns.find((column) => column.id === '2026-06-04').cards.some((card) => card.id === 't3'));

console.log('task board model tests passed');
