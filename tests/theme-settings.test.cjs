const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const theme = fs.readFileSync(path.join(root, 'assets', 'theme-settings.js'), 'utf8');

assert.match(html, /id='appThemeBootstrap'/);
assert.match(html, /pt_app_theme_v1/);
assert.match(html, /app\.js\?v=20260812-theme-controls-v2/);
assert.match(loader, /theme-settings\.js\?v=20260812-theme-controls-v2/);
assert.match(theme, /data-app-theme="soft"/);
assert.match(theme, /data-app-theme="classic"/);
assert.match(theme, /document\.body\.classList\.toggle\('reference-theme'/);
assert.match(theme, /localStorage\.setItem\(KEY, theme\)/);
assert.match(theme, /PROJECT_PALETTE/);
assert.match(theme, /querySelectorAll\('\.task-card\.wk-task'\)/);
assert.match(theme, /querySelectorAll\('\.timeline-event'\)/);

console.log('theme settings checks passed');
