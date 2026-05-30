import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) { return fs.readFileSync(file, 'utf8'); }

for (const file of [
  'src/react/tasks/TaskCard.tsx',
  'src/react/tasks/TaskBoard.tsx',
  'src/react/projects/ProjectCard.tsx',
  'src/react/team/UserCard.tsx',
  'src/react/chat/ChatPage.tsx',
  'src/react/actions/workspaceActions.ts'
]) {
  const text = read(file);
  assert.equal(text.includes('window.__WorkspaceApp'), false, `${file} must not depend on __WorkspaceApp`);
}
assert.equal(fs.existsSync('src/app/runtime-compatibility.js'), false, 'runtime compatibility bridge must be removed after Stage 26F');
console.log('data-action reduction tests passed');
