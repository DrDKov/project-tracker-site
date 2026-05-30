import assert from 'node:assert/strict';
import { queryKeysForRealtimeTable } from '../../src/shared/realtime/realtimeInvalidation.ts';
import { workspaceQueryKeys } from '../../src/react/data/queries/workspaceQueryKeys.ts';

function keyStrings(table, row = {}) {
  return queryKeysForRealtimeTable(table, row).map((key) => JSON.stringify(key));
}

assert.ok(keyStrings('tasks').includes(JSON.stringify(workspaceQueryKeys.tasks())));
assert.ok(keyStrings('tasks').includes(JSON.stringify(workspaceQueryKeys.notifications())));
assert.ok(keyStrings('tasks').includes(JSON.stringify(workspaceQueryKeys.bootstrap())));
assert.ok(keyStrings('projects').includes(JSON.stringify(workspaceQueryKeys.projects())));
assert.ok(keyStrings('project_members').includes(JSON.stringify(workspaceQueryKeys.members())));
assert.ok(keyStrings('task_assignees').includes(JSON.stringify(workspaceQueryKeys.tasks())));
assert.ok(keyStrings('task_comments').includes(JSON.stringify(workspaceQueryKeys.notifications())));
assert.ok(keyStrings('material_files').includes(JSON.stringify(workspaceQueryKeys.materials())));
assert.deepEqual(queryKeysForRealtimeTable('project_messages', { project_id: 'p1' }), [workspaceQueryKeys.bootstrap(), workspaceQueryKeys.chat('p1')]);
assert.deepEqual(queryKeysForRealtimeTable('unknown_table'), [workspaceQueryKeys.all]);

console.log('query realtime integration tests passed');
