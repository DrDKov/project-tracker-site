const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'assets', 'app-runtime.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'app.css'), 'utf8');
const baseCss = fs.readFileSync(path.join(root, 'assets', 'app-base.css'), 'utf8');
const migration = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260813075441_add_subtask_completion_state.sql'),
  'utf8',
);
const setup = fs.readFileSync(path.join(root, 'supabase', 'setup.sql'), 'utf8');

for (const sql of [migration, setup]) {
  assert.match(sql, /completion_state text/);
  assert.match(sql, /'not_done', 'partial', 'done'/);
  assert.match(sql, /sync_task_subtask_completion_state/);
  assert.match(sql, /NEW\.is_done := NEW\.completion_state = 'done'/);
}

assert.match(runtime, /SUBTASK_STATES=\['not_done','partial','done'\]/);
assert.match(runtime, /function subtaskState\(s\)/);
assert.match(runtime, /function nextSubtaskState\(s\)/);
assert.match(runtime, /subtaskState\(x\)==='partial'\?\.5:0/);
assert.match(runtime, /data-action="cycle-subtask"/);
assert.match(runtime, /role="checkbox"/);
assert.match(runtime, /aria-checked="\$\{state==='partial'\?'mixed'/);
assert.match(runtime, /completion_state:next,is_done:done/);
assert.match(runtime, /SUBTASK_STATE_UPDATES\.has\(id\)/);

for (const sheet of [css, baseCss]) {
  assert.match(sheet, /\.wk-subcheck\[data-state="partial"\]/);
  assert.match(sheet, /stroke='%23d97706'/);
  assert.match(sheet, /\.wk-subcheck\[data-state="done"\]/);
  assert.match(sheet, /\.wk-subrow\.partial/);
}

console.log('subtask three-state completion checks passed');
