const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const loader = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'assets', 'app-runtime.js'), 'utf8');
const source = fs.readFileSync(path.join(root, 'assets', 'subtask-reorder.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'app.css'), 'utf8');
const deployTransform = fs.readFileSync(path.join(root, '.github', 'scripts', 'apply_recurrence_scope.py'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20260727_task_subtask_reorder_rpc.sql'), 'utf8');

assert.match(loader, /subtask-reorder\.js\?v=20260728-ios-temporal-v1/);
assert.match(loader, /app-runtime\.js\?v=20260728-ios-temporal-v1/);
assert.match(deployTransform, /ver='20260728-ios-temporal-v1'/);
assert.match(runtime, /class="wk-sublist" data-task-id=/);
assert.match(runtime, /class="wk-subdrag-handle"/);
assert.match(runtime, /Math\.max\(0,\.\.\.subs\(task_id\)\.map/);
assert.match(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), /app\.css\?v=20260728-ios-temporal-v1/);
assert.match(css, /touch-action:none/);
assert.match(css, /appearance:none!important/);
assert.match(css, /position:absolute!important;left:0!important;top:0!important;bottom:0!important;width:15px!important/);
assert.match(css, /position:static!important;width:44px!important;height:44px!important/);
assert.match(source, /addEventListener\('pointermove'/);
assert.match(source, /addEventListener\('pointercancel'/);
assert.match(source, /event\.key !== 'ArrowUp'/);
assert.match(source, /client\.rpc\('reorder_task_subtasks'/);
assert.match(runtime, /subtask-pointer-active/);
assert.match(runtime, /subtask-reorder-finished/);
assert.match(css, /width:44px!important;height:44px!important/);
assert.match(migration, /security invoker/);
assert.match(migration, /update public\.task_subtasks as subtask/);
assert.match(migration, /v_updated_count <> v_requested_count/);

const listeners = {};
const board = { querySelectorAll(){ return []; } };
const documentMock = {
  readyState: 'complete',
  body: { classList: { add(){}, remove(){} }, appendChild(){} },
  getElementById(id){ return id === 'kanban' ? board : null; },
  querySelectorAll(){ return []; },
  createElement(){
    return {
      id: '', className: '', textContent: '',
      setAttribute(){},
    };
  },
  addEventListener(type, callback){ listeners[type] = callback; },
};
class MutationObserverMock { observe(){} }

const calls = [];
const taskSubtasks = [
  { id: 'a', task_id: 'task-1', sort_order: 1000 },
  { id: 'b', task_id: 'task-1', sort_order: 2000 },
  { id: 'c', task_id: 'task-1', sort_order: 3000 },
];
const windowMock = {
  __PT_SUBTASK_REORDER_TEST__: true,
  taskSubtasksV1: taskSubtasks,
  innerHeight: 800,
  requestAnimationFrame(callback){ callback(); return 1; },
  scrollBy(){},
  addEventListener(){},
  sb: {
    rpc(name, args){
      calls.push({ name, args });
      return Promise.resolve({
        data: args.p_updates.map(change => ({ id: change.id, sort_order: change.sort_order })),
        error: null,
      });
    },
  },
};

vm.runInNewContext(source, {
  window: windowMock,
  document: documentMock,
  MutationObserver: MutationObserverMock,
  Map,
  Set,
  Array,
  Number,
  Object,
  Promise,
  setTimeout,
  alert(){},
});

const api = windowMock.__SUBTASK_REORDER_TEST_API__;
assert.ok(api, 'test API must be exposed in explicit test mode');

assert.deepEqual(
  JSON.parse(JSON.stringify(api.planRankUpdates(['b', 'a', 'c'], 'a', { a: 1000, b: 2000, c: 3000 }))),
  [{ id: 'a', sort_order: 2500 }],
  'a gap should update only the moved subtask',
);
assert.deepEqual(
  JSON.parse(JSON.stringify(api.planRankUpdates(['c', 'a', 'b'], 'c', { a: 1000, b: 2000, c: 3000 }))),
  [{ id: 'c', sort_order: 0 }],
  'moving to the beginning should use a rank before the first row',
);
assert.deepEqual(
  JSON.parse(JSON.stringify(api.planRankUpdates(['b', 'a', 'c'], 'a', { a: 0, b: 1, c: 2 }))),
  [
    { id: 'b', sort_order: 1000 },
    { id: 'a', sort_order: 2000 },
    { id: 'c', sort_order: 3000 },
  ],
  'contiguous ranks should be safely rebalanced',
);

api.applyRankUpdates([{ id: 'a', sort_order: 2500 }]);
assert.equal(taskSubtasks[0].sort_order, 2500);

api.writeRankUpdates('task-1', [{ id: 'a', sort_order: 2500 }]).then(() => {
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, 'reorder_task_subtasks');
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].args)), {
    p_task_id: 'task-1',
    p_updates: [{ id: 'a', sort_order: 2500 }],
  });
  console.log('Subtask reorder regression checks passed');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
