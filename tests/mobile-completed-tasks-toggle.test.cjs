const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const loader = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
const source = fs.readFileSync(path.join(root, 'assets', 'mobile-completed-tasks-toggle.js'), 'utf8');
const deployTransform = fs.readFileSync(path.join(root, '.github', 'scripts', 'apply_recurrence_scope.py'), 'utf8');

assert.match(
  loader,
  /mobile-completed-tasks-toggle\.js\?v=20260722-completed-v1/,
  'the mobile completed-task control must be loaded with a fresh cache token',
);
assert.match(source, /modeToggle\.insertAdjacentElement\('afterend', doneToggle\)/);
assert.match(source, /Показывать завершённые/);
assert.doesNotMatch(source, /createElement\(['"]input['"]\)/, 'the existing checkbox and its state handler must be reused');
assert.match(
  deployTransform,
  /ver='20260814-native-pickers-v1'/,
  'the Pages build must not restore an obsolete app.js cache token',
);

function classList(){
  const values = new Set();
  return {
    add(value){ values.add(value); },
    remove(value){ values.delete(value); },
    contains(value){ return values.has(value); },
  };
}

const label = { textContent: 'Выполненные' };
const checkbox = {
  attributes: {},
  getAttribute(name){ return this.attributes[name] || null; },
  setAttribute(name, value){ this.attributes[name] = value; },
};
const filterBody = {};
const doneToggle = {
  parentElement: filterBody,
  nextElementSibling: null,
  classList: classList(),
  attributes: {},
  querySelector(selector){ return selector === 'span' ? label : selector === 'input' ? checkbox : null; },
  getAttribute(name){ return this.attributes[name] || null; },
  setAttribute(name, value){ this.attributes[name] = value; },
};
const modeToggle = {
  nextElementSibling: null,
  insertAdjacentElement(position, element){
    assert.equal(position, 'afterend');
    element.parentElement = toolbar;
    element.nextElementSibling = this.nextElementSibling;
    this.nextElementSibling = element;
  },
};
const toolbar = {
  insertBefore(element, reference){
    assert.equal(reference, modeToggle);
    element.parentElement = this;
    element.nextElementSibling = reference;
    modeToggle.nextElementSibling = null;
  },
};
const styles = new Map();
const head = {
  appendChild(element){ styles.set(element.id, element); },
};
const documentMock = {
  readyState: 'complete',
  head,
  documentElement: head,
  querySelector(selector){ return selector === '#tasks>.toolbar' ? toolbar : null; },
  getElementById(id){
    if(id === 'taskBoardModeToggle') return modeToggle;
    if(id === 'taskShowDoneWrap') return doneToggle;
    return styles.get(id) || null;
  },
  createElement(tag){ return { tagName: tag.toUpperCase(), id: '', textContent: '' }; },
  addEventListener(){},
};
let mediaChange = null;
const media = {
  matches: true,
  addEventListener(event, callback){ if(event === 'change') mediaChange = callback; },
};
class MutationObserverMock {
  constructor(callback){ this.callback = callback; }
  observe(){}
}
const windowMock = {
  matchMedia(){ return media; },
  MutationObserver: MutationObserverMock,
  requestAnimationFrame(callback){ callback(); return 1; },
};

vm.runInNewContext(source, {
  window: windowMock,
  document: documentMock,
  MutationObserver: MutationObserverMock,
  setTimeout,
  clearTimeout,
});

assert.equal(doneToggle.parentElement, toolbar);
assert.equal(modeToggle.nextElementSibling, doneToggle);
assert.equal(label.textContent, 'Показывать завершённые');
assert.equal(checkbox.attributes['aria-label'], 'Показывать завершённые задачи');
assert.equal(doneToggle.classList.contains('mobile-completed-visible'), true);

media.matches = false;
mediaChange();
assert.equal(doneToggle.parentElement, toolbar);
assert.equal(doneToggle.nextElementSibling, modeToggle);
assert.equal(label.textContent, 'Выполненные');
assert.equal(doneToggle.classList.contains('mobile-completed-visible'), false);

console.log('Mobile completed-task toggle regression checks passed');
