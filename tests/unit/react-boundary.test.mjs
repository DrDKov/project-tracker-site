import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const REACT = path.join(ROOT, 'src', 'react');
const allowedBrowserBoundary = new Set([
  'src/react/core/createReactIsland.tsx',
  'src/react/app-shell/mountAppShell.tsx',
  'src/react/tasks/mountTaskModal.tsx',
  'src/react/modals/mountWorkspaceModals.tsx',
  'src/react/state/workspaceStoreAdapter.ts',
  'src/react/actions/workspaceActions.ts',
  'src/react/pwa/PwaLifecycle.tsx'
]);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = walk(REACT).filter((file) => /\.(js|jsx|ts|tsx)$/.test(file));
assert.ok(files.length > 20, 'React migration files should be present');

for (const file of files) {
  const rel = path.relative(ROOT, file).replaceAll(path.sep, '/');
  const content = fs.readFileSync(file, 'utf8');
  assert.equal(/from\s+['\"]\.\.\/\.\.\/features\//.test(content), false, `${rel} must not import legacy features`);
  const touchesBrowser = /\b(document|window)\./.test(content) || content.includes('__WorkspaceApp');
  if (touchesBrowser) assert.ok(allowedBrowserBoundary.has(rel), `${rel} must not touch browser globals outside adapter/mount boundary`);
}

console.log('react boundary tests passed');
