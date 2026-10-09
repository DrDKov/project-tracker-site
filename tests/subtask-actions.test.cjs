const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'assets', 'app-runtime.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'app.css'), 'utf8');
const lines = runtime.split(/\r?\n/);
const take = prefix => {
  const line = lines.find(value => value.startsWith(prefix));
  assert.ok(line, `${prefix} missing`);
  return line;
};
const source = [
  take('const SUBTASK_STATES='),
  take('const SUBTASK_ADDS='),
  take('const SUBTASK_STATE_WRITES='),
  take('const TASK_STATE_WRITES='),
  take('function completionWrites('),
  take('function completionResponse('),
  ...['rtId', 'rtKey', 'rtArray', 'rtNewer', 'rtUpsert', 'rtRemove', 'subtaskState', 'nextSubtaskState',
    'addSubtask', 'submitSubtaskForm', 'subtaskStatePatch', 'flushSubtaskState', 'cycleSubtask', 'copySubtaskTitle', 'subtaskStructureKey', 'handleRealtimePayload']
    .map(name => lines.find(value => value.startsWith(`function ${name}(`) || value.startsWith(`async function ${name}(`))),
  take("document.addEventListener('click',e=>{let check="),
].join('\n');
assert.ok(!source.includes('undefined'));
assert.match(runtime, /data-action="copy-subtask"/);
assert.doesNotMatch(source, /label\?\.querySelector/);
assert.match(css, /\.wk-sub \.wk-subtitle/);
assert.match(css, /grid-template-columns:32px minmax\(0,1fr\) 28px!important/);

const deferred = () => {
  let resolve;
  return { promise: new Promise(done => { resolve = done; }), resolve };
};
const inserts = [];
const updates = [];
let copied = '';
let clickHandler;
let fullRenders = 0;
let realtimeRenders = 0;
let stateRefreshes = 0;
const S = {
  subtasks: [], tasks: [], projects: [], users: [], assignees: [], taskComments: [],
  profile: { id: 'author-1' },
};
S.sb = {
  rpc(name,args) {
    assert.equal(name,'set_subtask_completion');
    const request=deferred();
    updates.push({patch:{completion_state:args.p_state,is_done:args.p_state==='done'},request});
    return request.promise;
  },
  from(table) {
    assert.equal(table, 'task_subtasks');
    return {
      insert(row) {
        const request = deferred();
        inserts.push({ row, request });
        return { select: () => ({ single: () => request.promise }) };
      },
      update(patch) {
        const request = deferred();
        updates.push({ patch, request });
        return { eq() { return this; }, select() { return this; }, single() { return request.promise; } };
      },
    };
  },
};
const context = vm.createContext({
  S, Date, Map, Set, console,
  byId: (rows, id) => rows.find(row => row.id === id),
  subs: taskId => S.subtasks.filter(row => row.task_id === taskId && !row.deleted_at),
  render: () => { fullRenders += 1; },
  refreshSubtaskStateUI: () => { stateRefreshes += 1; },
  setRealtimeStatus: () => {},
  scheduleRealtimeRender: () => { realtimeRenders += 1; },
  alert: message => { throw new Error(message); },
  navigator: { clipboard: { writeText: async value => { copied = value; } } },
  showSubtaskCopied: () => {},
  document: { addEventListener(type, fn, capture) { if (type === 'click' && capture) clickHandler = fn; } },
});
vm.runInContext(source, context);

(async () => {
  const input = { value: 'Абдулин А. А.', isConnected: true, focus() {} };
  const button = { disabled: false, setAttribute() {}, removeAttribute() {} };
  const form = { dataset: { taskId: 'task-1' }, isConnected: true, querySelector: selector => selector.includes('title') ? input : button };
  context.form = form;
  vm.runInContext('submitSubtaskForm(form); submitSubtaskForm(form)', context);
  assert.equal(inserts.length, 1, 'one tap must send one insert');

  const replacementForm = { ...form, dataset: { taskId: 'task-1' } };
  context.replacementForm = replacementForm;
  vm.runInContext('submitSubtaskForm(replacementForm)', context);
  assert.equal(inserts.length, 1, 'a re-rendered form must not insert while the first request is pending');

  const row = { id: 'sub-1', task_id: 'task-1', title: 'Абдулин А. А.', completion_state: 'not_done',
    is_done: false, created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z' };
  context.incomingRow = row;
  vm.runInContext('rtUpsert("task_subtasks", incomingRow)', context);
  inserts[0].request.resolve({ data: row, error: null });
  await new Promise(setImmediate);
  assert.equal(S.subtasks.length, 1, 'insert response and realtime event must not duplicate a row');
  assert.equal(input.value, '', 'successful insert must clear the composer');
  const rendersAfterInsert = fullRenders;

  const first = vm.runInContext('cycleSubtask("sub-1")', context);
  assert.equal(S.subtasks[0].completion_state, 'partial');
  assert.equal(updates.length, 1);
  vm.runInContext('cycleSubtask("sub-1")', context);
  assert.equal(S.subtasks[0].completion_state, 'done', 'second tap must apply immediately');
  assert.equal(updates.length, 1, 'writes must be serialized');

  const firstSaved = { ...row, ...updates[0].patch, updated_at: '2026-10-01T10:00:01Z' };
  context.incomingRow = firstSaved;
  vm.runInContext('handleRealtimePayload("task_subtasks", {eventType:"UPDATE",new:incomingRow})', context);
  assert.equal(S.subtasks[0].completion_state, 'done', 'realtime must not undo a newer tap');
  updates[0].request.resolve({ data: firstSaved, error: null });
  await new Promise(setImmediate);
  assert.equal(updates.length, 2);
  const secondSaved = { ...firstSaved, ...updates[1].patch, updated_at: '2026-10-01T10:00:02Z' };
  updates[1].request.resolve({ data: secondSaved, error: null });
  await first;
  assert.equal(S.subtasks[0].completion_state, 'done');
  context.incomingRow = secondSaved;
  vm.runInContext('handleRealtimePayload("task_subtasks", {eventType:"UPDATE",new:incomingRow})', context);
  assert.equal(fullRenders, rendersAfterInsert, 'status taps and saving must preserve the checkbox DOM');
  assert.equal(realtimeRenders, 0, 'status-only realtime acknowledgements must not replace the board');
  assert.ok(stateRefreshes >= 4, 'checkbox and progress must update in place');
  context.incomingRow = { ...secondSaved, title: 'Изменённое название', updated_at: '2026-10-01T10:00:03Z' };
  vm.runInContext('handleRealtimePayload("task_subtasks", {eventType:"UPDATE",new:incomingRow})', context);
  assert.equal(realtimeRenders, 1, 'structural edits must still refresh the board');
  S.subtasks[0].title = 'Абдулин А. А.';

  let stopped = 0;
  clickHandler({
    target: { closest: selector => selector.includes('copy-subtask') ? { dataset: { id: 'sub-1' } } : null },
    preventDefault() {}, stopPropagation() { stopped += 1; }, stopImmediatePropagation() { stopped += 1; },
  });
  await new Promise(setImmediate);
  assert.equal(copied, 'Абдулин А. А.');
  assert.equal(updates.length, 2, 'clicking the title must not change completion');
  assert.equal(stopped, 2);
  copied = '';
  clickHandler({
    target: { closest: selector => selector === '.wk-subrow' ? { querySelector: () => ({ dataset: { id: 'sub-1' } }) } : null },
    preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {},
  });
  await new Promise(setImmediate);
  assert.equal(copied, 'Абдулин А. А.', 'empty row space must copy the title too');
  assert.equal(updates.length, 2);
  console.log('Subtask tap, copy, and realtime deduplication checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
