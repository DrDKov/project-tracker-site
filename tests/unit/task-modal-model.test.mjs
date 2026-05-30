import assert from 'node:assert/strict';
import { createTaskModalModel, valuesOf } from '../../src/react/tasks/taskModalModel.ts';

const model = createTaskModalModel();

assert.equal(model.title, 'Задача');
assert.equal(model.fields.assignees, 'Исполнители');
assert.deepEqual(valuesOf(model.statusOptions), ['planned', 'in_progress', 'waiting', 'done']);
assert.deepEqual(valuesOf(model.priorityOptions), ['high', 'medium', 'low']);
assert.deepEqual(valuesOf(model.repeatOptions), ['daily', 'weekdays', 'weekly', 'monthly']);
assert.deepEqual(valuesOf(model.weekdayOptions), ['1', '2', '3', '4', '5', '6', '7']);
assert.match(model.assigneeHint, /несколько исполнителей/);
assert.equal(model.commentsTitle, 'Комментарии');

console.log('task modal model tests passed');
