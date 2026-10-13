const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'assets', 'app-runtime.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'app.css'), 'utf8');

assert.match(html, /id='chatFiles' type='file' multiple/);
// Cache keys must agree with the generator used by GitHub Pages.
const generator=fs.readFileSync(path.join(root,'.github','scripts','apply_recurrence_scope.py'),'utf8');
const expectedVersion=generator.match(/ver='([^']+)'/)?.[1];
assert.ok(expectedVersion,'Deployment cache version must be specified');
assert.equal(html.match(/assets\/app\.js\?v=([^'"]+)/)?.[1],expectedVersion);
assert.equal(loader.match(/app-runtime\.js\?v=([^'"]+)/)?.[1],expectedVersion);
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

// A single bubble must not occupy the entire message area, and two
// bubbles must not be split into equal-height rows. Layout stays flex/auto.
const scopedCss = css.slice(css.indexOf('/* Chat messages size to their own content'));
assert.ok(scopedCss.includes('/* End content-sized chat bubbles */'), 'Content-sized bubble styles must be present');
const transcriptRule = scopedCss.match(/body #chat #chatMessages\.chat-messages\s*\{([^}]*)\}/)?.[1] || '';
assert.match(transcriptRule,/display:flex!important/);
assert.match(transcriptRule,/flex-direction:column!important/);
assert.match(transcriptRule,/justify-content:flex-start!important/);
const bubbleRule = scopedCss.match(/body #chat #chatMessages\.chat-messages > \.chat-bubble\s*\{([^}]*)\}/)?.[1] || '';
assert.match(bubbleRule,/flex:0 0 auto!important/);
assert.match(bubbleRule,/width:fit-content!important/);
assert.match(bubbleRule,/height:auto!important/);
assert.match(bubbleRule,/max-width:84%!important/);
const mineRule = scopedCss.match(/body #chat #chatMessages\.chat-messages > \.chat-bubble\.mine\s*\{([^}]*)\}/)?.[1] || '';
assert.match(mineRule,/align-self:flex-end!important/);
const appHtml=fs.readFileSync(path.join(root,'index.html'),'utf8');
const pagesTransform=fs.readFileSync(path.join(root,'.github/scripts/apply_recurrence_scope.py'),'utf8');
assert.match(appHtml,/app\.css\?v=20261013-chat-bubble-height-v1/);
assert.match(pagesTransform,/css_ver='20261013-chat-bubble-height-v1'/);

console.log('chat attachment picker checks passed');
