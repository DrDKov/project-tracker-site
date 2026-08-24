const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'assets', 'app-runtime.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'app.css'), 'utf8');

assert.match(html, /id='chatFiles' type='file' multiple/);
assert.match(html, /assets\/app\.js\?v=20260824-chat-file-picker-v2/);
assert.match(loader, /app-runtime\.js\?v=20260824-chat-file-picker-v2/);
assert.match(runtime, /document\.createElement\('span'\)/);
assert.match(runtime, /control\.className='chat-file-control'/);
assert.match(runtime, /lab\.className='chat-file-btn'/);
assert.match(runtime, /control\.appendChild\(file\)/);
assert.match(runtime, /file\.classList\.add\('chat-native-file-input'\)/);
assert.match(runtime, /file\.setAttribute\('aria-label','Прикрепить файл или изображение'\)/);
assert.doesNotMatch(runtime, /file\.click\(\)/);
assert.match(css, /body #chat \.chat-file-control\{[\s\S]*?width:44px!important;height:44px!important/);
assert.match(css, /body #chat \.chat-file-control>\.chat-file-btn\{[\s\S]*?pointer-events:none!important/);
assert.match(css, /body #chat \.chat-compose\.wk-compact \.chat-file-control>#chatFiles\{[\s\S]*?display:block!important;[\s\S]*?width:44px!important;height:44px!important/);
assert.match(css, /#chatFiles\.chat-native-file-input\{[\s\S]*?opacity:1!important;clip-path:none!important;overflow:hidden!important/);
assert.match(css, /#chatFiles\.chat-native-file-input::file-selector-button[\s\S]*?width:44px!important;height:44px!important/);
assert.match(runtime, /file\.addEventListener\('change'/);
assert.match(runtime, /async function uploadChatFiles\(project_id\)/);
assert.match(runtime, /storage\.from\(BUCKET\)\.upload/);

console.log('chat attachment picker checks passed');
