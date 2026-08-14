const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const picker = fs.readFileSync(path.join(root, 'assets', 'native-pickers.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'app.css'), 'utf8');

assert.match(html, /id='taskStart' type='date'/);
assert.match(html, /id='taskDue' type='date'/);
assert.match(html, /id='taskStartTime' type='time'/);
assert.match(html, /id='taskEndTime' type='time'/);
assert.match(loader, /native-pickers\.js\?v=20260814-native-pickers-v1/);
assert.match(picker, /input\.showPicker\(\)/);
assert.match(picker, /input\.focus\(\{preventScroll:true\}\)/);
assert.match(picker, /try\{ input\.click\(\); \}catch/);
assert.match(picker, /button\.type = 'button'/);
assert.match(picker, /button\.disabled = input\.disabled \|\| input\.readOnly/);
assert.match(picker, /attributeFilter:\['disabled','readonly'\]/);
assert.doesNotMatch(picker, /input\.addEventListener\(['"]click/);
assert.match(css, /\.native-picker-field>\.input\[type='date'\],[\s\S]*?padding-inline-end:50px!important;overflow:visible!important/);
assert.match(css, /\.native-picker-trigger\{[\s\S]*?width:44px!important;height:44px!important/);
assert.match(css, /\.native-picker-trigger\[data-picker-type='date'\]/);
assert.match(css, /\.native-picker-trigger\[data-picker-type='time'\]/);
assert.match(css, /@media\(max-width:700px\)\{\.native-picker-field>[\s\S]*?padding:0 50px 0 12px!important;overflow:visible!important/);

console.log('native picker checks passed');
