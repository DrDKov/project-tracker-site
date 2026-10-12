const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const runtime=fs.readFileSync(path.join(__dirname,'../assets/app-runtime.js'),'utf8');
const block=(start,end)=>runtime.slice(runtime.indexOf(start),runtime.indexOf(end));

// Small DOM model: identity, attributes, live input values and child ordering.
class Node{
  constructor(tag,attrs={},children=[]){
    this.nodeType=tag==='#text'?3:1;this.tagName=this.nodeName=tag.toUpperCase();
    this.attrs=new Map(Object.entries(attrs));this.childNodes=[];this.parentNode=null;
    this.value=attrs.value||'';this.checked='checked' in attrs;
    this.selectionStart=2;this.selectionEnd=4;this.scrollTop=37;this.isConnected=true;
    this.append(...children);
  }
  get classList(){const a=(this.attrs.get('class')||'').split(' ').filter(Boolean);a.contains=c=>a.includes(c);return a}
  get type(){return this.attrs.get('type')||'text'}
  get attributes(){return [...this.attrs].map(([name,value])=>({name,value}))}
  getAttribute(name){return this.attrs.get(name)??null}
  hasAttribute(name){return this.attrs.has(name)}
  setAttribute(name,value){this.attrs.set(name,value)}
  removeAttribute(name){this.attrs.delete(name)}
  get firstChild(){return this.childNodes[0]||null}
  get nextSibling(){return this.parentNode?.childNodes[this.parentNode.childNodes.indexOf(this)+1]||null}
  get options(){return this.childNodes.filter(n=>n.tagName==='OPTION')}
  get selectedOptions(){return this.options.filter(n=>n.selected)}
  insertBefore(node,before){node.remove();let i=before?this.childNodes.indexOf(before):this.childNodes.length;assert.ok(i>=0);this.childNodes.splice(i,0,node);node.parentNode=this}
  append(...nodes){for(let node of nodes)this.insertBefore(node,null);return this}
  remove(){if(this.parentNode){let a=this.parentNode.childNodes;a.splice(a.indexOf(this),1);this.parentNode=null}}
}
const el=(tag,attrs={},...children)=>new Node(tag,attrs,children);
const c=vm.createContext({});
vm.runInContext(block('/* Stable UI updates preserve','/* Stable UI updates end */'),c);
const sync=(old,fresh)=>c.syncStableChildren(old,fresh);
const input=el('INPUT',{class:'wk-subadd-input',value:''});input.value='Незавершённый черновик';
const check=el('BUTTON',{'data-action':'cycle-subtask','data-id':'s','data-state':'partial',class:'wk-subcheck'});
const row=el('DIV',{'data-subtask-id':'s',class:'wk-subrow partial'},check);
const compact=el('BUTTON',{class:'compact-subadd-toggle','aria-expanded':'true'});
const header=el('DIV',{class:'wk-subh'},compact);
const form=el('FORM',{class:'wk-subadd','data-action':'add-subtask','data-saving':'1'},input);
const plus=el('BUTTON',{class:'wk-subadd-btn',disabled:'','aria-busy':'true'});form.append(plus);
const subs=el('DIV',{class:'wk-sub compact-composer-open'},header,row,form);
const menu=el('DIV',{class:'task-more open'},el('BUTTON',{'data-action':'task-menu'}));
const card=el('ARTICLE',{'data-task-id':'t',class:'task-card'},subs,menu);
const root=el('DIV',{},card);
function fresh(){return el('DIV',{},el('ARTICLE',{'data-task-id':'t',class:'task-card wk-complete'},
  el('P',{class:'done-meta'}),
  el('DIV',{class:'wk-sub'},el('DIV',{class:'wk-subh'}),
    el('DIV',{'data-subtask-id':'s',class:'wk-subrow done'},el('BUTTON',{'data-action':'cycle-subtask','data-id':'s','data-state':'done',class:'wk-subcheck'})),
    el('FORM',{class:'wk-subadd','data-action':'add-subtask'},el('INPUT',{class:'wk-subadd-input',value:''}),el('BUTTON',{class:'wk-subadd-btn'}))),
  el('DIV',{class:'task-more'},el('BUTTON',{'data-action':'task-menu'}))))}
sync(root,fresh());
assert.equal(root.childNodes[0],card,'changed task retains its DOM identity');
assert.equal(card.childNodes[1],subs,'completion metadata does not replace the subtask section');
assert.equal(subs.childNodes[1],row);assert.equal(row.childNodes[0],check);
assert.equal(check.getAttribute('data-state'),'done');
assert.equal(form.childNodes[0],input);assert.equal(input.value,'Незавершённый черновик');
assert.deepEqual([input.selectionStart,input.selectionEnd],[2,4]);
assert.equal(header.childNodes[0],compact,'compact action survives updates');
assert.ok(subs.classList.contains('compact-composer-open'));assert.ok(menu.classList.contains('open'));
assert.ok(plus.hasAttribute('disabled'),'pending add stays disabled until its own finalizer');
assert.equal(root.scrollTop,37,'no scroll reset');
sync(root,fresh());assert.equal(row.childNodes[0],check,'repeated updates retain the checkbox');

const search=el('INPUT',{id:'tlQ',value:'old'});search.value='Подготовить';
const timeline=el('DIV',{},el('DIV',{class:'timeline-calendar-toolbar'},search));
sync(timeline,el('DIV',{},el('DIV',{class:'timeline-calendar-toolbar'},el('INPUT',{id:'tlQ',value:'Подготовить'}))));
assert.equal(timeline.childNodes[0].childNodes[0],search,'typing does not replace timeline search');
const editor=el('TEXTAREA',{class:'task-comment-edit-text'});editor.value='Редактируемый текст';
const comments=el('DIV',{},el('DIV',{'data-comment-id':'c1'},editor));
sync(comments,el('DIV',{},el('DIV',{'data-comment-id':'c1'},el('TEXTAREA',{class:'task-comment-edit-text'})),el('DIV',{'data-comment-id':'c2'})));
assert.equal(comments.childNodes[0].childNodes[0],editor);assert.equal(editor.value,'Редактируемый текст');
const a=el('OPTION',{value:'a'}),b=el('OPTION',{value:'b'});b.selected=true;
const select=el('SELECT',{},a,b);
sync(select,el('SELECT',{},el('OPTION',{value:'b'}),el('OPTION',{value:'c'})));
assert.equal(select.options[0],b);assert.equal(select.options[1].getAttribute('value'),'c','option IDs are never confused with renamed labels');

const listeners={};let rendered=0,timer,applied=0,cleared=0;
const board={isConnected:true,contains:()=>true,__ptBoardSession:'a:p',replaceChildren(){cleared++}};
const anchor={dataset:{taskId:'t'},isConnected:true,closest:()=>board};
const lock=vm.createContext({S:{view:'tasks',user:{id:'a'},profile:{id:'p'}},qa:()=>[anchor],document:{addEventListener(name,fn){listeners[name]=fn},createElement(){return {content:{}}}},
  syncTaskBoardChildren(){applied++},
  setTimeout(fn){timer=fn;return 1},clearTimeout(){timer=null},requestAnimationFrame:fn=>fn(),renderTasks(){rendered++}});
vm.runInContext(block('/* Completion interaction anchor:','/* Completion interaction anchor end */'),lock);
vm.runInContext("holdTaskBoard('t');TASK_BOARD_PENDING={box:{isConnected:true},html:'stale'}",lock);
assert.equal(rendered,0,'write cannot immediately reorder the anchored card');
lock.releaseTaskBoard();assert.equal(rendered,1,'release regenerates the latest state instead of replaying stale HTML');
vm.runInContext("TASK_BOARD_POINTER_TYPE='touch';holdTaskBoard('t')",lock);assert.equal(typeof timer,'function');timer();
assert.equal(vm.runInContext('TASK_BOARD_ANCHOR',lock),null,'touch interaction has a bounded lifetime');
const boardSync=runtime.split(/\r?\n/).find(l=>l.startsWith('function syncTaskBoard('));vm.runInContext(boardSync,lock);
lock.board=board;vm.runInContext("holdTaskBoard('t');syncTaskBoard(board,'pending')",lock);assert.equal(applied,0);
vm.runInContext("S.user={id:'next-user'};syncTaskBoard(board,'new-session')",lock);
assert.equal(applied,1,'session changes bypass interaction holds and clear previous account UI');
assert.equal(cleared,1,'draft controls from the previous account are not recycled');
vm.runInContext("S.view='timeline';holdTaskBoard('t')",lock);
assert.equal(vm.runInContext('TASK_BOARD_ANCHOR',lock),null,'timeline toggles cannot lock an inactive task board');
assert.match(runtime,/syncStableContent\(e,withRenderDataIndexes\(renderCalendarTimeline\)\)/);
assert.match(runtime,/syncStableContent\(box,notice\+/);
console.log('UI stability: keyed control identity, input selection/drafts, open composers/menus, pending writes, timeline/comments, and completion anchors passed');
