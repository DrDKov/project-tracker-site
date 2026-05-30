import assert from 'node:assert/strict';
import { createTaskActionController } from '../../src/controllers/tasks/taskActions.ts';
import { createProjectActionController } from '../../src/controllers/projects/projectActions.ts';
import { createTeamActionController } from '../../src/controllers/team/teamActions.ts';
import { createDeleteActionController } from '../../src/controllers/shared/deleteActions.ts';

function byId(items, id) {
  return (items || []).find((item) => item.id === id);
}

async function expectRejectsMessage(promise, pattern) {
  let failed = false;
  try {
    await promise;
  } catch (error) {
    failed = true;
    assert.match(error.message || String(error), pattern);
  }
  assert.equal(failed, true, 'expected promise to reject');
}

{
  const calls = [];
  const state = {
    tasks: [{ id: 't1', title: 'Task', project_id: 'p1', status: 'planned', is_favorite: false }],
    subtasks: []
  };
  const repo = {
    save: async (id, row) => { calls.push(['save', id, row.title]); return { id: id || 't-new', ...row }; },
    replaceAssignees: async (taskId, ids) => { calls.push(['replaceAssignees', taskId, ids.join(',')]); return ids.map((user_id) => ({ task_id: taskId, user_id })); },
    updateCompletion: async (id, done, userId) => { calls.push(['updateCompletion', id, done, userId]); return true; },
    updateStatus: async (id, status, userId) => { calls.push(['updateStatus', id, status, userId]); return true; },
    updateTimeline: async (id, start, due) => { calls.push(['updateTimeline', id, start, due]); return true; },
    setFavorite: async (id, favorite) => { calls.push(['setFavorite', id, favorite]); return true; },
    createSubtask: async (row) => ({ id: 's1', ...row }),
    updateSubtaskDone: async (id, done) => { calls.push(['updateSubtaskDone', id, done]); return true; },
    deleteSubtask: async (id) => { calls.push(['deleteSubtask', id]); return true; }
  };
  let reloads = 0;
  let renders = 0;
  let taskRenders = 0;
  const controller = createTaskActionController({
    state,
    repository: repo,
    reload: async () => { reloads += 1; },
    render: () => { renders += 1; },
    renderTasks: () => { taskRenders += 1; },
    renderTimeline: () => undefined,
    byId,
    subtasksForTask: (taskId) => state.subtasks.filter((item) => item.task_id === taskId),
    currentView: () => 'tasks',
    currentUserId: () => 'u1'
  });

  await expectRejectsMessage(controller.saveTask({ title: '', project_id: 'p1', assigneeIds: [] }), /название/i);
  await expectRejectsMessage(controller.saveTask({ title: 'Task', project_id: '', assigneeIds: [] }), /проект/i);
  const saved = await controller.saveTask({ title: 'Saved', project_id: 'p1', assigneeIds: ['u1', 'u2'] });
  assert.equal(saved.id, 't-new');
  assert.deepEqual(calls.slice(0, 2), [['save', null, 'Saved'], ['replaceAssignees', 't-new', 'u1,u2']]);
  assert.equal(reloads, 1);

  await controller.toggleTask('t1', true);
  assert.equal(state.tasks[0].status, 'done');
  assert.equal(state.tasks[0].completed_by_id, 'u1');
  assert.equal(taskRenders > 0, true);

  await controller.toggleFavorite('t1');
  assert.equal(state.tasks[0].is_favorite, true);

  const subtask = await controller.addSubtask('t1', '  Подзадача  ');
  assert.equal(subtask.title, 'Подзадача');
  assert.equal(state.subtasks.length, 1);
  assert.equal(renders > 0, true);

  const emptySubtask = await controller.addSubtask('t1', '   ');
  assert.equal(emptySubtask, null);
}

{
  const state = { tasks: [{ id: 't1', title: 'Task', project_id: 'p1', status: 'planned', is_favorite: false }], subtasks: [] };
  const repo = {
    save: async () => ({ id: 't1' }), replaceAssignees: async () => [], updateCompletion: async () => true,
    updateStatus: async () => true, updateTimeline: async () => true,
    setFavorite: async () => { throw new Error('repository failed'); },
    createSubtask: async () => ({}), updateSubtaskDone: async () => true, deleteSubtask: async () => true
  };
  const controller = createTaskActionController({
    state,
    repository: repo,
    reload: async () => undefined,
    render: () => undefined,
    renderTasks: () => undefined,
    renderTimeline: () => undefined,
    byId,
    subtasksForTask: () => [],
    currentView: () => 'tasks',
    currentUserId: () => 'u1'
  });
  await expectRejectsMessage(controller.toggleFavorite('t1'), /repository failed/);
  assert.equal(state.tasks[0].is_favorite, false, 'optimistic favorite change must rollback on repository failure');
}

{
  const calls = [];
  const projectController = createProjectActionController({
    repository: {
      save: async (id, row) => { calls.push(['saveProject', id, row.name]); return { id: id || 'p1', ...row }; },
      upsertMember: async (row) => { calls.push(['upsertMember', row.project_id, row.user_id]); return row; },
      removeMember: async (id) => { calls.push(['removeMember', id]); return true; }
    },
    reload: async () => { calls.push(['reload']); },
    renderAccess: () => { calls.push(['renderAccess']); }
  });
  await expectRejectsMessage(projectController.saveProject(null, { name: '  ' }), /название проекта/i);
  await projectController.saveProject(null, { name: 'Project' });
  await projectController.saveAccess({ project_id: 'p1', user_id: 'u1', access_role: 'viewer' });
  const skipped = await projectController.saveAccess({ project_id: 'p1', user_id: '', access_role: 'viewer' });
  assert.equal(skipped, false);
  await projectController.removeAccess('m1');
  assert.deepEqual(calls.filter((item) => item[0] !== 'reload' && item[0] !== 'renderAccess'), [
    ['saveProject', null, 'Project'],
    ['upsertMember', 'p1', 'u1'],
    ['removeMember', 'm1']
  ]);
}

{
  const calls = [];
  const teamController = createTeamActionController({
    repository: {
      save: async (id, row) => { calls.push(['saveUser', id, row.display_name]); return { id: id || 'u1', ...row }; },
      deactivate: async (id) => { calls.push(['deactivate', id]); return true; }
    },
    reload: async () => { calls.push(['reload']); }
  });
  await expectRejectsMessage(teamController.saveUser(null, { display_name: '   ' }), /имя/i);
  await teamController.saveUser(null, { display_name: 'User' });
  await teamController.deactivateUser('u1');
  assert.deepEqual(calls.filter((item) => item[0] !== 'reload'), [['saveUser', null, 'User'], ['deactivate', 'u1']]);
}

{
  const calls = [];
  const deleteController = createDeleteActionController({
    repository: { softDelete: async (table, id) => { calls.push(['softDelete', table, id]); return true; } },
    reload: async () => { calls.push(['reload']); },
    confirmDelete: () => false
  });
  const denied = await deleteController.softDelete('tasks', 't1');
  assert.equal(denied, false);
  assert.deepEqual(calls, []);

  const allowedController = createDeleteActionController({
    repository: { softDelete: async (table, id) => { calls.push(['softDelete', table, id]); return true; } },
    reload: async () => { calls.push(['reload']); },
    confirmDelete: () => true
  });
  const allowed = await allowedController.softDelete('tasks', 't1');
  assert.equal(allowed, true);
  assert.deepEqual(calls, [['softDelete', 'tasks', 't1'], ['reload']]);
}

console.log('controller behavior tests passed');
