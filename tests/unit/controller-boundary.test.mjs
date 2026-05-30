import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CONTROLLERS = path.join(ROOT, 'src', 'controllers');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.ts$/.test(full)) out.push(full);
  }
  return out;
}

const files = walk(CONTROLLERS).map((file) => path.relative(ROOT, file).replaceAll(path.sep, '/')).sort();

assert.deepEqual(files, [
  'src/controllers/chat/chatActions.ts',
  'src/controllers/materials/materialActions.ts',
  'src/controllers/projects/projectActions.ts',
  'src/controllers/shared/deleteActions.ts',
  'src/controllers/tasks/taskActions.ts',
  'src/controllers/team/teamActions.ts',
  'src/controllers/timeline/timelineActions.ts'
]);

for (const file of files) {
  const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
  assert.equal(/\.from\s*\(/.test(content), false, `${file} must not call Supabase .from directly`);
  assert.equal(/\.rpc\s*\(/.test(content), false, `${file} must not call Supabase .rpc directly`);
  assert.equal(/\.storage\s*\./.test(content), false, `${file} must not call Supabase storage directly`);
  assert.equal(/from ['"][.\/]*\.\.\/\.\.\/services\//.test(content), false, `${file} must not import services directly`);
}

const runtimeActions = fs.readFileSync(path.join(ROOT, 'src/features/actions/runtime-actions.js'), 'utf8');
assert.match(runtimeActions, /createTaskActionController/);
assert.match(runtimeActions, /createProjectActionController/);
assert.match(runtimeActions, /createTeamActionController/);
assert.equal(/from ['"][.\/]*\.\.\/\.\.\/services\//.test(runtimeActions), false, 'runtime action adapter must not import services directly');

console.log('controller boundary tests passed');
