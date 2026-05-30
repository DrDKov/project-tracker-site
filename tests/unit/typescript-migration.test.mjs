import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const reactRoot = path.join(ROOT, 'src', 'react');

function walk(dir, predicate = () => true) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, predicate));
    else if (predicate(full)) out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, '/');
}

const reactJsFiles = walk(reactRoot, (file) => /\.(js|jsx)$/.test(file));
assert.deepEqual(reactJsFiles.map(rel), [], 'src/react should not contain JS/JSX after Stage 22');

const requiredTsFiles = [
  'src/react/tasks/taskCardModel.ts',
  'src/react/tasks/TaskCard.tsx',
  'src/react/tasks/TaskBoard.tsx',
  'src/react/tasks/TaskModal.tsx',
  'src/react/projects/projectModel.ts',
  'src/react/projects/ProjectsPage.tsx',
  'src/react/materials/materialsModel.ts',
  'src/react/team/teamModel.ts',
  'src/react/timeline/timelineModel.ts',
  'src/react/chat/chatModel.ts',
  'src/react/app-shell/appShellModel.ts',
  'src/react/core/createReactIsland.tsx',
  'src/react/state/workspaceStoreAdapter.ts',
  'src/react/data/workspaceDataLayer.ts',
  'src/react/actions/workspaceActions.ts'
];
for (const file of requiredTsFiles) {
  assert.equal(fs.existsSync(path.join(ROOT, file)), true, `${file} must exist`);
}

const runner = fs.readFileSync(path.join(ROOT, 'tools', 'run-unit-tests.mjs'), 'utf8');
assert.equal(runner.includes('node_modules'), true, 'unit test runner should use the local TS-aware runner');
assert.match(runner, /tsx/, 'unit test runner should execute tests through tsx after Stage 22');

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
assert.equal(Boolean(pkg.devDependencies?.tsx), true, 'tsx must be available for TS-aware unit tests');

const tsconfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'tsconfig.json'), 'utf8'));
assert.equal(tsconfig.compilerOptions.allowImportingTsExtensions, true, 'tsconfig must allow explicit .ts/.tsx imports');

console.log('typescript migration tests passed');
