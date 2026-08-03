const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'app.css'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'assets', 'app-runtime.js'), 'utf8');

assert.match(html, /viewport-fit=cover/);
assert.match(html, /minimum-scale=1,maximum-scale=1,user-scalable=no/);
assert.match(html, /@media\(max-width:980px\)\{html,body\{touch-action:manipulation!important\}\}/);
assert.match(html, /const mobileZoomMq=window\.matchMedia\('\(max-width:980px\)'\)/);
assert.match(html, /const blockMobileZoom=e=>\{if\(mobileZoomMq\.matches\)e\.preventDefault\(\)\}/);
assert.match(html, /document\.addEventListener\('gesturestart',blockMobileZoom,\{passive:false\}\)/);
assert.match(html, /#quickTaskBtn:before,body #quickTaskBtn:after/);
assert.match(html, /#quickTaskBtn:before\{width:20px!important;height:2px!important\}/);
assert.match(html, /#quickTaskBtn:after\{width:2px!important;height:20px!important\}/);
assert.match(html, /#taskDateFilter\{[\s\S]*?grid-template-columns:minmax\(0,1fr\)!important/);
assert.match(html, /#taskDateFilter>\*\{min-width:0!important;max-width:100%!important\}/);

assert.match(css, /\.form-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(css, /#taskModal input\.input\[type='date'\][\s\S]*?min-inline-size:0!important/);
assert.match(css, /#taskModal \.task-calendar-time-grid,#taskModal \.task-repeat-options\{width:100%!important;min-width:0!important;max-width:100%!important\}/);
assert.match(css, /@supports \(-webkit-touch-callout:none\)/);
assert.match(css, /dialog\.modal input\.input\[type='date'\],[\s\S]*?padding:0!important;overflow:hidden!important/);
assert.match(css, /::-webkit-date-and-time-value[\s\S]*?padding:0 12px!important/);
assert.match(css, /#taskModal \.form-grid>label:has\(#taskStart\)/);
assert.match(css, /dialog#taskModal>form#taskForm>\.modal-actions\{margin-top:14px!important/);
assert.match(css, /#settings \.settings-grid>\.panel:first-child>label\+\.row\{margin-top:14px!important;gap:10px!important\}/);

assert.match(runtime, /document\.body\.classList\.toggle\('mobile-chat-view',v==='chat'\)/);
assert.match(css, /body\.mobile-chat-view \.app \.main\{height:calc\(100dvh - 72px - env\(safe-area-inset-bottom\)\)/);
assert.match(css, /body #chat \.chat-compose\.wk-compact\{[\s\S]*?grid-template-columns:44px minmax\(0,1fr\) 44px!important/);
assert.match(css, /body #chat #chatMessages\.chat-messages\{min-height:0!important;max-height:none!important/);
assert.match(html, /id='taskCommentText' rows='1' placeholder='Напишите комментарий\.\.\.'/);
assert.match(css, /#taskModal #taskCommentsBlock \.task-comment-form\{[\s\S]*?grid-template-columns:minmax\(0,1fr\) 44px!important;gap:7px!important/);
assert.match(css, /#taskModal #taskCommentText\{[\s\S]*?height:44px!important;min-height:44px!important;max-height:96px!important/);
assert.match(css, /#taskModal #taskCommentText\{[\s\S]*?border-radius:22px!important;resize:none!important;overflow-y:auto!important/);
assert.match(css, /#taskModal #taskCommentsBlock button\.task-comment-send[\s\S]*?width:44px!important;height:44px!important;[\s\S]*?border-radius:999px!important;[\s\S]*?background-color:#0a84ff!important/);
assert.doesNotMatch(css, /#taskModal #taskCommentText\{[^}]*min-height:1(?:18|40)px!important/);
assert.match(runtime, /setAttribute\('aria-label','Отправить сообщение'\)/);
assert.match(runtime, /setAttribute\('aria-label','Очистить чат'\)/);

console.log('mobile layout checks passed');
