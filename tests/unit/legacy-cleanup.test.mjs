import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(ROOT, file));

assert.equal(exists('src/features/notifications/polling-fallback.js'), false, 'retired notification fallback must be removed');
assert.equal(exists('src/app/bootstrap.js'), false, 'legacy bootstrap.js must be removed');
assert.equal(exists('src/app/runtime-compatibility.js'), false, 'runtime compatibility bridge must be removed');
const moduleLoader = read('src/app/workspaceModuleLoader.ts');
assert.equal(moduleLoader.includes('notification-polling-fallback'), false);
assert.equal(moduleLoader.includes('polling-fallback'), false);
assert.equal(moduleLoader.includes('react-app-shell'), false, 'React AppShell is mounted by App.tsx, not legacy module loader');

const reactReadme = read('src/react/README.md');
assert.equal(reactReadme.includes('window.__WorkspaceApp'), true);

console.log('legacy cleanup tests passed');
