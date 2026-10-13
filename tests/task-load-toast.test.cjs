const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const js=fs.readFileSync(path.join(root,'assets/task-load-toast.js'),'utf8');
const runtime=fs.readFileSync(path.join(root,'assets/app-runtime.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/app.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const timers=new Map();let clock=0,nextId=0;
const setTimeoutFake=(fn,ms)=>{const id=++nextId;timers.set(id,{time:clock+ms,fn});return id};
const clearTimeoutFake=id=>timers.delete(id);
function advance(ms){
 clock+=ms;
 for(const [id,job] of [...timers]){
  if(job.time<=clock){timers.delete(id);job.fn()}
 }
}
let toast=null;
function createElement(){
 const children={};
 const el={id:'',isConnected:false,hidden:true,dataset:{},attributes:{},listeners:{},
  setAttribute(k,v){this.attributes[k]=v},
  querySelector(k){return children[k]||(children[k]={textContent:'',listeners:{},addEventListener(ev,fn){this.listeners[ev]=fn}})},
  set innerHTML(v){this._markup=v},get innerHTML(){return this._markup}
 };
 return el;
}
const doc={body:{appendChild(el){el.isConnected=true;toast=el}},createElement,getElementById:id=>toast?.id===id?toast:null};
const context=vm.createContext({window:{},document:doc,setTimeout:setTimeoutFake,clearTimeout:clearTimeoutFake});
vm.runInContext(js,context);
const api=context.window.ProjectTrackerTaskLoadToast;
assert.ok(api&&typeof api.begin==='function'&&typeof api.finish==='function');
api.begin();
assert.equal(toast,null,'short requests never create a toast');
advance(699);
assert.equal(toast,null,'delay before notification');
advance(1);
assert.equal(toast.hidden,false,'slow request opens toast');
assert.equal(toast.dataset.phase,'loading');
assert.match(toast.querySelector('.pt-task-load-title').textContent,/Загружаем задачи/);
api.retry();
assert.equal(toast.dataset.phase,'retry');
assert.match(toast.querySelector('.pt-task-load-title').textContent,/Повторяем загрузку/);
api.finish();
assert.equal(toast.hidden,true,'completed request hides the notification');
api.retry();
assert.equal(toast.hidden,true,'late retry cannot reopen a completed request');
api.begin();advance(750);api.fail();
assert.equal(toast.dataset.phase,'error','final failures are shown without a perpetual spinner');
assert.equal(toast.hidden,false);
toast.querySelector('.pt-task-load-close').listeners.click();
assert.equal(toast.hidden,true,'error notification can be dismissed');
api.begin();api.finish();advance(900);
assert.equal(toast.hidden,true,'completed fast load does not show a stale timer');
api.begin();advance(750);assert.equal(toast.hidden,false);
api.begin();assert.equal(toast.hidden,true,'new request resets the old notice');
advance(750);assert.equal(toast.hidden,false);
api.clear();assert.equal(toast.hidden,true,'sign-out clears the toast');

assert.match(css,/\.pt-task-load-toast\s*\{\s*position:fixed/);
assert.match(css,/@keyframes pt-task-loading-ring/);
assert.match(css,/prefers-reduced-motion:reduce/);
assert.match(html,/task-load-toast\.js\?v=20261013-task-loading-toast-v1/);
assert.match(html,/app\.css\?v=20261013-materials-v3-v1/);
assert.match(runtime,/ProjectTrackerTaskLoadToast/);
assert.match(runtime,/indicator\?\.begin\(\)/);
assert.match(runtime,/indicator\?\.retry\(\)/);
assert.match(runtime,/indicator\?\.fail\(\)/);
assert.match(runtime,/indicator\?\.finish\(\)/);
assert.doesNotMatch(runtime,/class="task-load-note"|note\+COLS|note\+cols/,'No task status alert may be injected into grid markup');
console.log('Delayed floating task-loading indicator, retries, errors, dismiss and layout assertions passed');
