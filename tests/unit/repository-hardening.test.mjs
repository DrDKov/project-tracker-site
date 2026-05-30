import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const repoDir = path.join(ROOT, 'src', 'repositories');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

assert.ok(fs.existsSync(path.join(repoDir, 'repositoryError.ts')), 'repositoryError.ts must exist');
assert.ok(fs.existsSync(path.join(repoDir, 'workspaceRepositories.ts')), 'workspaceRepositories.ts must exist');

const errorFile = read('src/repositories/repositoryError.ts');
assert.match(errorFile, /class RepositoryError extends Error/, 'RepositoryError must be a typed error boundary');
assert.match(errorFile, /repositoryCall/, 'repositoryCall wrapper must exist');
assert.match(errorFile, /assertRepositoryClient/, 'repository client assertion must exist');

const workspaceSet = read('src/repositories/workspaceRepositories.ts');
for (const key of ['tasks', 'projects', 'materials', 'notifications', 'users', 'chat', 'delete']) {
  assert.match(workspaceSet, new RegExp(`${key}:`), `workspace repository set must expose ${key}`);
}
assert.match(workspaceSet, /Object\.freeze/, 'workspace repository set should be immutable');

const repositoryFiles = walk(repoDir).filter((file) => /Repository\.ts$/.test(file));
assert.ok(repositoryFiles.length >= 7, 'all domain repositories must exist');
for (const file of repositoryFiles) {
  const rel = path.relative(ROOT, file).replaceAll(path.sep, '/');
  const content = fs.readFileSync(file, 'utf8');
  assert.match(content, /assertRepositoryClient/, `${rel} must assert repository client`);
  assert.match(content, /repository(Call|Sync)/, `${rel} must wrap service calls in repository error boundary`);
}

const runtimeActions = read('src/features/actions/runtime-actions.js');
assert.match(runtimeActions, /createWorkspaceRepositorySet/, 'runtime action adapter must use the repository set factory');
assert.equal(/createTaskRepository|createProjectRepository|createUserRepository|createDeleteRepository/.test(runtimeActions), false, 'runtime action adapter must not instantiate individual repositories directly');

const workspaceQueries = read('src/react/data/queries/workspaceQueries.ts');
assert.match(workspaceQueries, /createWorkspaceRepositorySet/, 'query layer must use repository set factory');
assert.equal(/createTaskRepository|createProjectRepository|createUserRepository/.test(workspaceQueries), false, 'query layer must not instantiate individual repositories directly');

console.log('repository hardening tests passed');
