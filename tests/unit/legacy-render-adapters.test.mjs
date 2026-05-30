import assert from 'node:assert/strict';
import fs from 'node:fs';

assert.equal(fs.existsSync('src/app/runtime-compatibility.js'), false, 'Stage 26F removes runtime compatibility bridge');
assert.equal(fs.existsSync('src/app/legacy/legacyDomTemplate.ts'), false, 'Stage 26F removes legacy DOM template');
console.log('legacy render adapter cleanup tests passed');
