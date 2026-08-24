const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'assets', 'app-runtime.js'), 'utf8');

assert.match(html, /@supabase\/supabase-js@2\.111\.0/);
assert.doesNotMatch(html, /@supabase\/supabase-js@2(?:['"]|<)/);
assert.match(html, /assets\/app\.js\?v=20260824-chat-file-picker-v2/);
assert.match(loader, /app-runtime\.js\?v=20260824-chat-file-picker-v2/);
assert.match(html, /id='taskSaveBtn'/);
assert.match(html, /type='button' class='btn primary' id='taskSaveBtn'/);
assert.match(runtime, /taskSaveBtn'\)\.onclick=e=>runTaskSave\(e\)/);
assert.match(runtime, /data-action="add-subtask-now"/);
assert.match(runtime, /submitSubtaskForm\(a\.closest\('\.wk-subadd'\)\)/);
assert.match(runtime, /\(hover:hover\) and \(pointer:fine\)/);

console.log('runtime action health checks passed');
