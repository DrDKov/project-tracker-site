import assert from 'node:assert/strict';
import {
  createReactWorkspaceModel,
  createWorkspaceDataModel,
  createWorkspaceStatusModel
} from '../../src/react/state/workspaceStoreAdapter.ts';
import { getWorkspaceDataLayer, getWorkspaceEntityIndexes } from '../../src/react/data/workspaceDataLayer.ts';

const state = {
  view: 'tasks',
  profile: { id: 'u1', display_name: 'Owner', role: 'owner' },
  projects: [{ id: 'p1', name: 'Салым' }],
  tasks: [{ id: 't1', title: 'Задача', project_id: 'p1' }],
  users: [{ id: 'u1', display_name: 'Owner' }],
  notifications: [{ id: 'n1', is_read: false }, { id: 'n2', is_read: true }],
  warnings: ['w1'],
  statusTitle: 'Подключено',
  statusText: 'Готово',
  sb: {}
};

const data = createWorkspaceDataModel(state);
assert.equal(data.view, 'tasks');
assert.equal(data.counts.projects, 1);
assert.equal(data.counts.tasks, 1);
assert.equal(data.counts.unreadNotifications, 1);
assert.equal(data.status.title, 'Подключено');

const status = createWorkspaceStatusModel(state);
assert.equal(status.text, 'Готово');
assert.deepEqual(status.warnings, ['w1']);

const model = createReactWorkspaceModel(state);
assert.equal(model.data.profile.id, 'u1');
assert.equal(typeof model.actions.setView, 'function');

const layer = getWorkspaceDataLayer(state);
assert.equal(layer.loaded, true);
assert.equal(layer.hasClient, true);

const indexes = getWorkspaceEntityIndexes(state);
assert.equal(indexes.projectsById.get('p1').name, 'Салым');
assert.equal(indexes.tasksById.get('t1').title, 'Задача');
assert.equal(indexes.usersById.get('u1').display_name, 'Owner');

console.log('workspace state model tests passed');
