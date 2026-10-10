const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const runtime=fs.readFileSync(path.join(__dirname,'../assets/app-runtime.js'),'utf8');
const original=process.env.PERF_BASELINE;
const block=(start,end)=>runtime.slice(runtime.indexOf(start),runtime.indexOf(end));
const lines=runtime.split(/\r?\n/);
const take=prefix=>{const line=lines.find(x=>x.startsWith(prefix));assert.ok(line,prefix);return line};
const source=block('/* Render-scoped indexes:','/* Render-scoped indexes end */')+'\n'+
  take('function tids(')+'\n'+take('function taskCommentList(')+'\n'+take('function taskCommentCount(');
function state(count=357){
  return {tasks:Array.from({length:count},(_,i)=>({id:'t'+i,assignee_id:'u'+i%8})),
    users:Array.from({length:8},(_,i)=>({id:'u'+i,display_name:'User '+i})),projects:[],
    assignees:Array.from({length:count},(_,i)=>({task_id:'t'+i,user_id:'u'+i%8})),
    subtasks:Array.from({length:count*3},(_,i)=>({id:'s'+i,task_id:'t'+i%count,sort_order:i,title:'Sub '+i})),
    taskComments:Array.from({length:count*2},(_,i)=>({id:'c'+i,task_id:'t'+i%count,created_at:String(i).padStart(6,'0')}))};
}
const S=state(),context=vm.createContext({S});
vm.runInContext(source,context);
const call=code=>vm.runInContext(code,context);
S.assignees.push({...S.assignees[0]});
assert.equal(call('tids(S.tasks[0]).length'),1,'reads deduplicate without rewriting shared state');
const originalAssignees=S.assignees;
call('withRenderDataIndexes(()=>{for(let t of S.tasks){tids(t);subs(t.id);taskCommentCount(t.id);uname(t.assignee_id)}})');
assert.equal(S.assignees,originalAssignees,'render reads must not mutate assignments');
assert.equal(call('RENDER_DATA_INDEXES'),null,'indexes are discarded after each render');
call("withRenderDataIndexes(()=>{subs('t0');withRenderDataIndexes(()=>subs('t0'))})");
assert.equal(call('RENDER_DATA_INDEXES'),null,'nested rendering shares a safe synchronous scope');
assert.throws(()=>call("withRenderDataIndexes(()=>{throw Error('test')})"),/test/);
assert.equal(call('RENDER_DATA_INDEXES'),null,'errors cannot leave a stale cache');
call("withRenderDataIndexes(()=>byId(S.users,'u0'))");
S.users[0]={id:'u0',display_name:'Changed'};S.subtasks[0]={...S.subtasks[0],title:'Changed'};
assert.equal(call("withRenderDataIndexes(()=>uname('u0'))"),'Changed','same-length row replacement is fresh');
assert.equal(call("withRenderDataIndexes(()=>subs('t0')[0].title)"),'Changed');
assert.equal(call("withRenderDataIndexes(()=>taskCommentCount('t0'))"),2);
S.taskComments=S.taskComments.filter(c=>c.task_id!=='t0');
assert.equal(call("withRenderDataIndexes(()=>taskCommentCount('t0'))"),0,'deletions are not cached');

class Element{
  constructor(tag,classes='',data={},html=''){this.tagName=tag;this.className=classes;this.dataset=data;this.markup=html;this.children=[];this.parent=null;this.classList={contains:c=>this.className.split(' ').includes(c)};}
  get outerHTML(){return this.markup||'<'+this.tagName+'>'+this.children.map(x=>x.outerHTML).join('')+'</'+this.tagName+'>';}
  get firstElementChild(){return this.children[0]||null;}
  get nextElementSibling(){return this.parent?.children[this.parent.children.indexOf(this)+1]||null;}
  insertBefore(node,cursor){node.remove();const i=cursor?this.children.indexOf(cursor):this.children.length;assert.ok(i>=0,'cursor stays attached');this.children.splice(i,0,node);node.parent=this;}
  remove(){if(this.parent){this.parent.children.splice(this.parent.children.indexOf(this),1);this.parent=null;}}
  querySelector(){return null;}
  append(...nodes){nodes.forEach(n=>this.insertBefore(n,null));return this;}
}
const boardSource=block('/* Keyed board updates preserve','/* Keyed board updates end */');
const boardContext=vm.createContext({document:{activeElement:null},requestAnimationFrame:()=>{},withRenderDataIndexes:fn=>fn()});
vm.runInContext(boardSource,boardContext);
const card=(id,title=id)=>new Element('ARTICLE','task-card',{taskId:id},'<article data-task-id="'+id+'">'+title+'</article>');
const col=(id,...cards)=>new Element('DIV','col',{status:id}).append(new Element('H3','','',id),...cards);
const root=new Element('DIV');
const sync=desired=>boardContext.syncTaskBoardChildren(root,desired);
sync(new Element('DIV').append(col('planned',card('a'),card('b')),col('done',card('c'))));
const a=root.children[0].children[1],b=root.children[0].children[2],c=root.children[1].children[1];
sync(new Element('DIV').append(col('planned',card('a'),card('b')),col('done',card('c'))));
assert.equal(root.children[0].children[1],a);assert.equal(root.children[0].children[2],b);
sync(new Element('DIV').append(col('planned',card('b','Changed'),card('a')),col('done',card('c'))));
assert.equal(root.children[0].children.length,3,'changed cards do not leave duplicate nodes');
assert.equal(root.children[0].children[2],a,'reordering retains unchanged node');
assert.equal(root.children[1].children[1],c,'other columns are untouched');
sync(new Element('DIV').append(col('planned',card('a')),col('done',card('c'))));
assert.equal(root.children[0].children.length,2,'removed cards disappear');
sync(new Element('DIV').append(col('planned',card('a')),col('done',card('c'),card('d'))));
assert.equal(root.children[1].children.length,3,'new cards appear exactly once');
assert.doesNotMatch(runtime,/setInterval\(\(\)=>\{if\(tl\(\)\)sch\(\)\},700\)/);
assert.match(runtime,/document\.querySelector\('#timeline.active \.wk-tl'\)/);
assert.match(runtime,/scheduleTaskSearch\(\)/);
assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'../assets/assignment-notifications.js'),'utf8'),/setInterval\(function\(\)\{ ensureMentionHint\(\); decorateRenderedComments\(\); \},700\)/);
if(original){
  const baseline=(original==='HEAD'?require('node:child_process').execFileSync('git',['show','HEAD:assets/app-runtime.js'],{cwd:path.join(__dirname,'..'),encoding:'utf8'}):fs.readFileSync(original,'utf8')).split(/\r?\n/);
  const before=vm.createContext({S:state()});
  vm.runInContext(['function dedupeTaskAssignees(', 'function byId(', 'function tids(', 'function taskCommentList(', 'function taskCommentCount('].map(p=>baseline.find(l=>l.startsWith(p))).join('\n'),before);
  const after=vm.createContext({S:state()});vm.runInContext(source,after);
  const work='for(let t of S.tasks){for(let i=0;i<3;i++)tids(t);subs(t.id);taskCommentCount(t.id);uname(t.assignee_id)}';
  for(let i=0;i<4;i++){vm.runInContext(work,before);vm.runInContext('withRenderDataIndexes(()=>{'+work+'})',after);}
  function measure(ctx,code){let start=performance.now();for(let i=0;i<12;i++)vm.runInContext(code,ctx);return (performance.now()-start)/12;}
  console.log(JSON.stringify({syntheticTasks:357,baselineMs:measure(before,work),indexedMs:measure(after,'withRenderDataIndexes(()=>{'+work+'})')}));
}
console.log('Performance checks passed: render-scoped indexes, fresh mutations, keyed insert/update/delete/reorder, and event-driven idle work');
