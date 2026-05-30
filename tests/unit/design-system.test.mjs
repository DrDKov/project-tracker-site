import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const uiDir = path.join(root, 'src/shared/ui');

const requiredFiles = [
  'Button.tsx',
  'Badge.tsx',
  'Card.tsx',
  'Dropdown.tsx',
  'EmptyState.tsx',
  'Form.tsx',
  'Modal.tsx',
  'Tabs.tsx',
  'index.ts',
  'README.md'
];

for (const file of requiredFiles) {
  assert.ok(fs.existsSync(path.join(uiDir, file)), `missing shared/ui/${file}`);
}

const index = fs.readFileSync(path.join(uiDir, 'index.ts'), 'utf8');
for (const token of ['Button', 'Badge', 'Card', 'Dropdown', 'EmptyState', 'Form', 'Modal', 'Tabs']) {
  assert.ok(index.includes(token) || index.includes(`./${token}`), `shared/ui index should export ${token}`);
}

const css = fs.readFileSync(path.join(root, 'src/styles/design-system.css'), 'utf8');
for (const token of ['--ds-primary', '--ds-radius-md', '.ds-btn', '.ds-card', '.ds-badge', '.ds-tabs']) {
  assert.ok(css.includes(token), `design-system.css should include ${token}`);
}

const mainCss = fs.readFileSync(path.join(root, 'src/styles/main.css'), 'utf8');
assert.ok(mainCss.includes("@import './design-system.css';"), 'main.css should import design system CSS');

const appShell = fs.readFileSync(path.join(root, 'src/react/app-shell/AppShell.tsx'), 'utf8');
const projectCard = fs.readFileSync(path.join(root, 'src/react/projects/ProjectCard.tsx'), 'utf8');
const userCard = fs.readFileSync(path.join(root, 'src/react/team/UserCard.tsx'), 'utf8');
const notifications = fs.readFileSync(path.join(root, 'src/react/notifications/NotificationCenter.tsx'), 'utf8');

assert.ok(appShell.includes("from '../../shared/ui'"), 'AppShell should consume shared/ui primitives');
assert.ok(projectCard.includes("from '../../shared/ui'"), 'ProjectCard should consume shared/ui primitives');
assert.ok(userCard.includes("from '../../shared/ui'"), 'UserCard should consume shared/ui primitives');
assert.ok(notifications.includes("from '../../shared/ui'"), 'NotificationCenter should consume shared/ui primitives');

console.log('Design system tests passed');
