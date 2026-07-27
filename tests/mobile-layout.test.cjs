const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'app.css'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'assets', 'app-runtime.js'), 'utf8');

assert.match(html, /viewport-fit=cover/);
assert.match(html, /#quickTaskBtn:before,body #quickTaskBtn:after/);
assert.match(html, /#quickTaskBtn:before\{width:20px!important;height:2px!important\}/);
assert.match(html, /#quickTaskBtn:after\{width:2px!important;height:20px!important\}/);
assert.match(html, /#taskDateFilter\{[\s\S]*?grid-template-columns:minmax\(0,1fr\)!important/);
assert.match(html, /#taskDateFilter>\*\{min-width:0!important;max-width:100%!important\}/);

assert.match(css, /\.form-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(css, /#taskModal input\.input\[type='date'\][\s\S]*?min-inline-size:0!important/);
assert.match(css, /#taskModal \.form-grid>label:has\(#taskStart\)/);
assert.match(css, /dialog#taskModal>form#taskForm>\.modal-actions\{margin-top:14px!important/);
assert.match(css, /#settings \.settings-grid>\.panel:first-child>label\+\.row\{margin-top:14px!important;gap:10px!important\}/);

assert.match(runtime, /document\.body\.classList\.toggle\('mobile-chat-view',v==='chat'\)/);
assert.match(css, /body\.mobile-chat-view \.app \.main\{height:calc\(100dvh - 72px - env\(safe-area-inset-bottom\)\)/);
assert.match(css, /body #chat \.chat-compose\.wk-compact\{[\s\S]*?grid-template-columns:44px minmax\(0,1fr\) 44px!important/);
assert.match(css, /body #chat #chatMessages\.chat-messages\{min-height:0!important;max-height:none!important/);
assert.match(runtime, /setAttribute\('aria-label','Отправить сообщение'\)/);
assert.match(runtime, /setAttribute\('aria-label','Очистить чат'\)/);

console.log('mobile layout checks passed');
