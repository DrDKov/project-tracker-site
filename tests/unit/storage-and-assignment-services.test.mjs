import assert from 'node:assert/strict';
import { replaceTaskAssignees } from '../../src/services/tasks.service.js';
import { uploadMaterialFile } from '../../src/services/materials.service.js';
import { safeStorageName } from '../../src/services/chat.service.js';

function createTaskAssigneeClient(existingRows) {
  const calls = [];
  return {
    calls,
    from(table) {
      assert.equal(table, 'task_assignees');
      return {
        select() {
          return { eq: async () => ({ data: existingRows, error: null }) };
        },
        delete() {
          return {
            eq() {
              return {
                in(_column, values) {
                  calls.push(['delete', values]);
                  return { data: null, error: null };
                }
              };
            }
          };
        },
        insert(rows) {
          calls.push(['insert', rows]);
          return { data: rows, error: null };
        }
      };
    }
  };
}

{
  const client = createTaskAssigneeClient([{ user_id: 'u1' }, { user_id: 'u2' }]);
  const result = await replaceTaskAssignees(client, 'task-1', ['u2', 'u3', 'u3', '__none__', '']);
  assert.deepEqual(result, [
    { task_id: 'task-1', user_id: 'u2' },
    { task_id: 'task-1', user_id: 'u3' }
  ]);
  assert.equal(client.calls.length, 2);
  assert.deepEqual(client.calls[0], ['delete', ['u1']]);
  assert.deepEqual(client.calls[1], ['insert', [{ task_id: 'task-1', user_id: 'u3' }]]);
}

{
  const client = createTaskAssigneeClient([{ user_id: 'u1' }, { user_id: 'u2' }]);
  await replaceTaskAssignees(client, 'task-1', ['u1', 'u2']);
  assert.deepEqual(client.calls, [], 'unchanged assignees must not be deleted/reinserted');
}

function createMaterialClient() {
  const calls = [];
  const storageBucket = {
    upload(path, _file, options) {
      calls.push(['upload', path, options.contentType]);
      return Promise.resolve({ data: { path }, error: null });
    },
    remove(paths) {
      calls.push(['remove', paths]);
      return Promise.resolve({ data: null, error: null });
    }
  };
  return {
    calls,
    storage: { from(bucket) { calls.push(['bucket', bucket]); return storageBucket; } },
    from(table) {
      assert.equal(table, 'material_files');
      return {
        insert(row) {
          calls.push(['insert', row.storage_path, row.original_name]);
          return { select() { return { single: async () => ({ data: row, error: null }) }; } };
        }
      };
    }
  };
}

{
  const client = createMaterialClient();
  const file = { name: 'Согласия Пром мед.pdf', type: 'application/pdf', size: 1234 };
  const row = await uploadMaterialFile(client, 'workspace-materials', 'workspace 1', 'folder русский', 'owner-1', file, 'file id', 'fallback.pdf');
  assert.equal(row.original_name, 'Согласия Пром мед.pdf');
  assert.match(row.storage_path, /^[a-zA-Z0-9._/-]+$/);
  assert.ok(!row.storage_path.includes('Согласия'));
  assert.ok(row.storage_path.endsWith('_file.pdf'));
  assert.deepEqual(client.calls[0], ['bucket', 'workspace-materials']);
  assert.equal(client.calls.some((call) => call[0] === 'insert'), true);
}

assert.equal(safeStorageName('Файл с пробелами.pdf'), '_.pdf');
assert.equal(safeStorageName('normal-name_01.pdf'), 'normal-name_01.pdf');

console.log('storage and assignment service tests passed');
