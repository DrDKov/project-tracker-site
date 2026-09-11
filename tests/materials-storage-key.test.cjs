const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets', 'materials-v2.js'), 'utf8');
const safeLine = source.split(/\r?\n/).find((line) => line.includes('function safe(n)'));

assert.ok(safeLine, 'storage filename sanitizer must exist');

function sanitize(input) {
  const context = { input };
  vm.runInNewContext(`${safeLine}; result = safe(input);`, context);
  return context.result;
}

const cyrillic = sanitize('Справка в бассейн.docx');
assert.match(cyrillic, /^[A-Za-z0-9_.',!*&$@=;:+?() -]+$/);
assert.doesNotMatch(cyrillic, /[А-Яа-яЁё]/);
assert.match(cyrillic, /\.docx$/);
assert.ok(cyrillic.length <= 120);

const emoji = sanitize('отчёт 📎 финал 2026.pdf');
assert.match(emoji, /^[A-Za-z0-9_.',!*&$@=;:+?() -]+$/);
assert.match(emoji, /\.pdf$/);
assert.match(source, /original_name:file\.name/);
assert.match(source, /id\+'_'\+safe\(file\.name\)/);

console.log('materials storage key checks passed');
