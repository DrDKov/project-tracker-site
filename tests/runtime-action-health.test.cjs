const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');

assert.match(html, /@supabase\/supabase-js@2\.111\.0/);
assert.doesNotMatch(html, /@supabase\/supabase-js@2(?:['"]|<)/);
assert.match(html, /assets\/app\.js\?v=20260813-actions-v1/);
assert.match(loader, /app-runtime\.js\?v=20260813-actions-v1/);

console.log('runtime action health checks passed');
