const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'reference-theme.css'), 'utf8');

assert.match(html, /reference-theme\.css\?v=20260812-soft-teal-v3/);
assert.match(html, /<body class='reference-theme'>/);
assert.match(css, /--ref-base:#eee6d8/);
assert.match(css, /--ref-teal:#006164/);
assert.match(css, /linear-gradient\(145deg,#f7f0e3,#eae0cf\)/);
assert.match(css, /box-shadow:inset 3px 3px 7px/);
assert.match(css, /body\.reference-theme \.task-card,body\.reference-theme \.task-card\.wk-task/);
assert.match(css, /body\.reference-theme \.app \.sidebar \.nav>button\.active/);
assert.match(css, /body\.reference-theme #chat #chatMessages\.chat-messages/);
assert.match(css, /body\.reference-theme #taskBoardModeToggle button\.active/);
assert.match(css, /body\.reference-theme #taskShowDoneToggle:checked/);
assert.match(css, /body\.reference-theme #taskShowDoneToggle:before/);
assert.match(css, /body\.reference-theme #taskShowDoneToggle:checked:before/);
assert.doesNotMatch(css, /body\.reference-theme #taskShowDoneToggle(?::checked)?:after/);
assert.match(css, /body\.reference-theme \.timeline-calendar-grid/);
assert.match(css, /body\.reference-theme #materials \.materials-tab\.active/);
assert.match(css, /body\.reference-theme \.week-add-task-btn/);
assert.match(css, /color-mix\(in srgb,var\(--accent/);
assert.match(css, /@media\(max-width:980px\)/);
assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);

console.log('reference theme checks passed');
