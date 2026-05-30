import assert from 'node:assert/strict';
import fs from 'node:fs';

function exists(file) { return fs.existsSync(file); }
const inventory = JSON.parse(fs.readFileSync('docs/runtime-decomposition.json', 'utf8'));

assert.equal(exists('src/app/runtime-core.js'), false, 'runtime-core.js must remain deleted');
assert.equal(exists('src/app/runtime-compatibility.js'), false, 'Stage 26F must delete runtime-compatibility.js');
assert.equal(exists('src/app/runtime.js'), false, 'Stage 26F must delete runtime.js');
assert.equal(inventory.stage, '26F', 'inventory must track Stage 26F');
assert.equal(inventory.runtimeFile, null, 'inventory runtimeFile must be null after Stage 26F');
assert.ok(inventory.removedInStage26F.some((item) => item.name === 'src/app/runtime-compatibility.js'), 'Stage 26F compatibility bridge deletion must be documented');
console.log('runtime bridge deletion tests passed');
