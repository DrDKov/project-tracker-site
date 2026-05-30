import assert from 'node:assert/strict';
import {
  accessFormToSaveInput,
  createAccessModalForm,
  createProjectModalForm,
  createUserModalForm,
  createUserOptions,
  projectFormToSaveInput,
  userFormToSaveInput,
  userName
} from '../../src/react/modals/modalModels.ts';

const owner = { id: 'u1', display_name: 'Owner', email: 'owner@example.com', is_active: true };
const inactive = { id: 'u2', display_name: 'Inactive', is_active: false };
const project = { id: 'p1', name: 'Салым', owner_id: 'u1', status: 'in_progress', priority: 'high', color: '#2563eb' };
const member = { id: 'm1', project_id: 'p1', user_id: 'u1', access_role: 'owner' };

const projectForm = createProjectModalForm(project, { defaultOwnerId: 'fallback' });
assert.equal(projectForm.name, 'Салым');
assert.equal(projectForm.owner_id, 'u1');
assert.equal(projectForm.status, 'in_progress');
assert.equal(projectForm.priority, 'high');
assert.deepEqual(projectFormToSaveInput({ ...projectForm, name: '  Новое имя  ', next_step: '', description: '' }), {
  name: 'Новое имя',
  owner_id: 'u1',
  status: 'in_progress',
  priority: 'high',
  start_date: null,
  deadline: null,
  color: '#2563eb',
  next_step: null,
  description: null
});

const newProject = createProjectModalForm(null, { defaultOwnerId: 'u1' });
assert.equal(newProject.owner_id, 'u1');
assert.equal(newProject.status, 'planned');
assert.equal(newProject.priority, 'medium');

const userForm = createUserModalForm({ id: 'u3', display_name: '  Dmitry  ', email: 'd@example.com', role: 'admin' });
assert.equal(userForm.role, 'admin');
assert.deepEqual(userFormToSaveInput(userForm), {
  display_name: 'Dmitry',
  email: 'd@example.com',
  role: 'admin',
  position: null,
  is_active: true
});

const accessForm = createAccessModalForm(project, [member, { id: 'm2', project_id: 'p2', user_id: 'u9' }]);
assert.equal(accessForm.project_id, 'p1');
assert.equal(accessForm.project_name, 'Салым');
assert.equal(accessForm.members.length, 1);
assert.deepEqual(accessFormToSaveInput({ ...accessForm, user_id: 'u1', access_role: 'editor' }), {
  project_id: 'p1',
  user_id: 'u1',
  access_role: 'editor'
});

assert.deepEqual(createUserOptions([owner, inactive]), [{ value: 'u1', label: 'Owner' }]);
assert.equal(userName('u1', [owner]), 'Owner');
assert.equal(userName('missing', [owner]), '—');

console.log('modal ownership model tests passed');
