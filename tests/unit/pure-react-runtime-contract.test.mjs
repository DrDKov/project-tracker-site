import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(ROOT, file));

for (const file of [
  'src/app/runtime-core.js',
  'src/app/runtime-compatibility.js',
  'src/app/runtime.js',
  'src/app/data-loader.js',
  'src/app/session-controller.js',
  'src/app/bootstrap.js',
  'src/app/legacy/legacyDomTemplate.ts'
]) {
  assert.equal(exists(file), false, `${file} must remain deleted after Stage 26F`);
}

const indexHtml = read('index.html');
assert.ok(indexHtml.includes('id="root"'));
assert.ok(indexHtml.includes('/src/app/main.tsx'));
assert.equal(indexHtml.includes('taskModal'), false, 'index.html must not contain legacy modal markup');
assert.equal(indexHtml.includes('projectGrid'), false, 'index.html must not contain legacy page containers');

const main = read('src/app/main.tsx');
assert.ok(main.includes('createRoot'));
assert.ok(main.includes('<App />'));

const app = read('src/app/App.tsx');
assert.ok(app.includes('ReactAppProviders'));
assert.ok(app.includes('WorkspaceBoot'));
assert.ok(app.includes('DashboardPage'));
assert.equal(app.includes('legacyDomTemplate'), false);
assert.equal(app.includes('bootWorkspaceModulesSafe'), false);

const modules = read('src/app/workspaceModules.ts');
assert.ok(modules.includes('WorkspaceModuleName'));
assert.ok(modules.includes("'pwa'"));
assert.equal(modules.includes('runtime'), false);
assert.equal(modules.includes('features/tasks'), false);

console.log('pure React runtime contract tests passed');
