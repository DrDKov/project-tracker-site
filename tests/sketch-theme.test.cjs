const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'sketch-theme.css'), 'utf8');

assert.match(html, /sketch-theme\.css\?v=20260812-neo-skeuo-v2/);
assert.match(html, /theme!==\'classic\'&&theme!==\'sketch\'/);
assert.match(html, /classList\.toggle\(\'sketch-theme\'/);
assert.match(css, /body\.sketch-theme\{/);
assert.match(css, /--sk-paper:#f4f0e6/);
assert.match(css, /box-shadow:5px 5px 0/);
assert.match(css, /body\.sketch-theme #taskBoardModeToggle button\.active/);
assert.match(css, /body\.sketch-theme #taskShowDoneToggle:checked/);
assert.match(css, /body\.sketch-theme #taskShowDoneToggle:before/);
assert.match(css, /body\.sketch-theme #taskShowDoneToggle:checked:before/);
assert.doesNotMatch(css, /body\.sketch-theme #taskShowDoneToggle(?::checked)?:after/);
assert.match(css, /body\.sketch-theme \.task-card,body\.sketch-theme \.task-card\.wk-task/);
assert.match(css, /color-mix\(in srgb,var\(--accent/);
assert.match(css, /body\.sketch-theme \.timeline-calendar-grid/);
assert.match(css, /body\.sketch-theme #materials \.materials-tab\.active/);
assert.match(css, /body\.sketch-theme \.week-add-task-btn/);
assert.match(css, /@media\(max-width:980px\)/);

console.log('sketch theme checks passed');
