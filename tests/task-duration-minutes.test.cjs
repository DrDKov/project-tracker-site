const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'assets/app-runtime.js'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8');

function durationInputAttributes(markup) {
  const input = markup.match(/<input\b[^>]*\bid=["']taskDurationMinutes["'][^>]*>/)?.[0];
  assert.ok(input, 'Task duration must be present in both initial HTML and runtime fallback');
  const attributes = Object.fromEntries(
    [...input.matchAll(/([a-z-]+)=["']([^"']+)["']/g)].map(([,key,value]) => [key,value])
  );
  const get = name => {
    assert.ok(attributes[name], name + ' must be explicitly declared');
    return attributes[name];
  };
  return { type:get('type'), min:Number(get('min')), step:Number(get('step')) };
}
for (const [name,markup] of [['initial task form',html],['dynamic fallback form',runtime]]) {
  const attrs = durationInputAttributes(markup);
  assert.equal(attrs.type,'number',name);
  assert.equal(attrs.min,1,name);
  assert.equal(attrs.step,1,name + ' must allow every integer minute, not 1, 6, 11, ...');
  for (const minutes of [1,5,10,15,30,45,56,60,61,90,120]) {
    assert.equal(minutes >= attrs.min && (minutes - attrs.min) % attrs.step === 0,true,
      name + ' should allow ' + minutes + ' minute task');
  }
  assert.equal(0 >= attrs.min,false,'Zero-duration task is still invalid');
}
assert.match(runtime,/if\(du!=null&&\(!Number\.isFinite\(du\)\|\|du<=0\)\)throw Error\('Длительность должна быть больше 0'\)/,
  'Task calendar validation must permit positive minute durations');
assert.match(loader,/app-runtime\.js\?v=20261013-planning-inbox-v1/,
  'Browser must fetch the fixed runtime, not the stale cached bundle');
assert.match(html,/assets\/app\.js\?v=20261013-planning-inbox-v1/,
  'Browser must fetch the new app loader');
console.log('Task duration 1–60 minute validation and browser cache checks passed');
