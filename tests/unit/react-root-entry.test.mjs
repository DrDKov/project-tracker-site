import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('src/app/App.tsx', 'utf8');
assert.equal(fs.existsSync('src/app/bootstrap.js'), false, 'legacy bootstrap.js must stay removed');
assert.equal(fs.existsSync('src/app/runtime-compatibility.js'), false, 'runtime compatibility bridge must be removed');
assert.equal(html.includes('id="root"'), true, 'index.html must expose React root');
assert.equal(html.includes('/src/app/main.tsx'), true, 'index.html must load main.tsx');
assert.equal(app.includes('legacyDomTemplate'), false, 'App must not mount legacy DOM template after Stage 26F');
assert.equal(app.includes('ReactAppProviders'), true, 'App must use React providers');
console.log('react root entry tests passed');
