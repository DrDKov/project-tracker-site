const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const runtime=fs.readFileSync(path.join(__dirname,'../assets/app-runtime.js'),'utf8');
const lines=runtime.split(/\r?\n/);
const take=name=>lines.find(l=>l.startsWith('function '+name+'(')||l.startsWith('async function '+name+'('));
const helpers=runtime.slice(runtime.indexOf('const WORKSPACE_HISTORY='),runtime.indexOf("document.addEventListener('click',event=>"));
const source=helpers+'\n'+['rtId','rtKey','rtArray','rtNewer','rtUpsert','rtRemove','taskCommentCount'].map(take).join('\n');
const tick=()=>new Promise(setImmediate);
function harness(){
  const S={user:{id:'auth-owner'},profile:{id:'owner',role:'owner'},projects:[],users:[],tasks:[],members:[],assignees:[],subtasks:[],acknowledgements:[],taskComments:[],messages:[],logs:[],warnings:[],view:'tasks'};
  const data={task_comments:[],project_messages:[],activity_log:[]},requests=[];
  let intercept=null;
  const client={from(table){
    const request={table,eq:[],after:null,columns:'*',limit:500,orders:[]};
    return {
      select(columns){request.columns=columns;return this},
      is(){return this},eq(column,value){request.eq.push([column,value]);return this},
      order(column,options){request.orders.push([column,options]);return this},
      limit(limit){request.limit=limit;return this},gt(column,value){request.after=value;return this},
      then(resolve,reject){
        requests.push(request);
        if(intercept){const result=intercept(request);if(result)return result.then(resolve,reject)}
        let rows=data[table].filter(r=>!r.deleted_at&&request.eq.every(([k,v])=>r[k]===v)&&(!request.after||r.id>request.after));
        rows=rows.slice().sort((a,b)=>a.id.localeCompare(b.id)).slice(0,request.limit);
        if(request.columns!=='*')rows=rows.map(r=>Object.fromEntries(request.columns.split(',').map(k=>[k,r[k]])));
        return Promise.resolve({data:rows,error:null}).then(resolve,reject);
      }
    };
  }};
  S.sb=client;
  const dom={taskId:{value:''},taskModal:{open:false}};
  const c=vm.createContext({S,Date,Map,Set,Promise,Error,console:{warn(){}},document:{},$:id=>dom[id],
    esc:x=>String(x),owner:()=>S.profile?.role==='owner',scheduleRender(){},renderTaskCommentsModal(){},renderChat(){},renderAudit(){},
    completionWrites:()=>null,dedupeTaskAssignees(){},taskCommentList:id=>S.taskComments.filter(r=>r.task_id===id&&!r.deleted_at),
    withTimeout:p=>Promise.resolve(p),required:async(name,p)=>{let r=await p;if(r.error)throw Error(r.error.message);return r.data||[]}});
  vm.runInContext(source,c);
  const call=code=>vm.runInContext(code,c);
  call('ensureWorkspaceHistoryIdentity()');
  return {S,data,requests,dom,c,call,setIntercept(fn){intercept=fn}};
}
async function histories(){
  const h=harness(),{S,data,requests,call}=h;
  data.task_comments=Array.from({length:1105},(_,i)=>({id:String(i).padStart(5,'0'),task_id:i<1100?'task-a':'task-b',body:'body-'+i,created_at:'2026-10-10T10:00:00Z',updated_at:'2026-10-10T10:00:00Z'}));
  await call('loadCommentIndex()');
  assert.equal(requests.length,3,'comment counters page beyond the REST 1000-row cap');
  assert.ok(requests.every(r=>!r.columns.includes('body')&&r.table==='task_comments'));
  assert.equal(S.taskComments.length,1105);
  assert.equal(call("taskCommentCount('task-a')"),1100);
  assert.ok(S.taskComments.every(r=>r.body===undefined),'no eager comment bodies');
  await call("loadTaskComments('task-b')");
  assert.equal(requests.at(-1).eq[0][1],'task-b');
  assert.equal(S.taskComments.filter(r=>typeof r.body==='string').length,5);
  await call("loadTaskComments('task-a')");
  assert.equal(S.taskComments.filter(r=>typeof r.body==='string').length,1105,'all requested task history is retained');
  const before=requests.length;await call("loadTaskComments('task-a')");assert.equal(requests.length,before,'reuse fresh session cache');
  data.project_messages=Array.from({length:1003},(_,i)=>({id:String(i).padStart(5,'0'),project_id:'p',body:'message-'+i,created_at:'2026-10-10T10:00:00Z'}));
  data.project_messages.push({id:'zzzzz',project_id:'other',body:'Other project'});
  await call("loadProjectMessages('p')");
  assert.equal(S.messages.length,1003,'no truncated chat history');
  assert.ok(requests.filter(r=>r.table==='project_messages').every(r=>r.eq.some(([k,v])=>k==='project_id'&&v==='p')));
  await call('loadAuditHistory()');assert.equal(requests.at(-1).table,'activity_log');assert.equal(requests.at(-1).limit,500);
  S.profile.role='member';const count=requests.length;await call('loadAuditHistory(true)');assert.equal(requests.length,count,'members do not request owner audit');
}
async function races(){
  const h=harness(),{S,c,call}=h;
  let release;
  h.setIntercept(()=>new Promise(resolve=>release=resolve));
  const first=call("loadTaskComments('task-a')"),second=call("loadTaskComments('task-a')");
  assert.equal(first,second,'one shared in-flight promise');await tick();
  c.incoming={id:'new',task_id:'task-a',body:'Written while loading',created_at:'2026-10-10T10:01:00Z'};
  call("rtUpsert('task_comments',incoming)");call("rtUpsert('task_comments',incoming)");
  c.removed={id:'old',task_id:'task-a'};call("rtRemove('task_comments',removed)");
  release({data:[{id:'old',task_id:'task-a',body:'Deleted while loading',created_at:'2026-10-10T10:00:00Z'}],error:null});
  await first;
  assert.equal(S.taskComments.length,1);assert.equal(S.taskComments[0].id,'new','late snapshot cannot erase writes or resurrect deletes');
  assert.equal(call("taskCommentList('task-a').length"),1,'duplicate events do not duplicate counters');
  const oldUser=call("loadProjectMessages('p')");await tick();
  S.user={id:'another-auth'};S.profile={id:'nurse',role:'member'};call('ensureWorkspaceHistoryIdentity()');
  release({data:[{id:'private-old',project_id:'p',body:'Old session'}],error:null});await oldUser;
  assert.equal(S.messages.length,0,'previous user response is discarded');assert.equal(S.taskComments.length,0,'session cache is cleared');
}
async function failures(){
  const h=harness(),{S,data,requests,call}=h;
  data.project_messages=[{id:'a',project_id:'p',body:'Keep me',created_at:'2026-10-10T10:00:00Z'}];
  await call("loadProjectMessages('p')");
  h.setIntercept(()=>Promise.resolve({error:{message:'offline'}}));
  await call("loadProjectMessages('p',true)");assert.equal(S.messages[0].body,'Keep me');
  assert.match(call("historyNotice('chat','p','истории чата')"),/Повторить/);
  const before=requests.length;await call("loadProjectMessages('p')");assert.equal(requests.length,before,'failed loads wait for explicit retry instead of looping');
  h.setIntercept(null);await call("loadProjectMessages('p',true)");assert.equal(call("workspaceHistoryState('chat','p').error"),'');
  data.project_messages=[];await call("loadProjectMessages('p',true)");assert.equal(S.messages.length,0,'confirmed empty snapshot clears old history');
}
async function overlappingSnapshots(){
  const h=harness(),{S,call}=h;
  let releaseIndex;
  h.setIntercept(request=>request.columns==='*'?Promise.resolve({data:[{id:'new',task_id:'task-a',body:'Newer task history',created_at:'2026-10-10T10:00:00Z'}],error:null}):new Promise(resolve=>releaseIndex=resolve));
  const index=call('loadCommentIndex()');await tick();
  await call("loadTaskComments('task-a')");
  releaseIndex({data:[],error:null});await index;
  assert.equal(S.taskComments.length,1,'an older counter snapshot cannot erase a newer scoped read');
  assert.equal(S.taskComments[0].body,'Newer task history');
  assert.equal(call("taskCommentCount('task-a')"),1);
}
async function startup(){
  const block=runtime.slice(runtime.indexOf('async function load(){'),runtime.indexOf('function vals('));
  const S={loading:false,user:{id:'u'},profile:{id:'u',role:'owner'},users:[],warnings:[],projects:[],tasks:[],members:[],assignees:[],subtasks:[]};
  const started=[],pending=[];
  const defer=name=>{started.push(name);return new Promise(resolve=>pending.push(()=>resolve(name==='projects'?[{id:'p'}]:[])))};
  S.sb={from:table=>({select(){return this},eq(){return this},order(){return table}})};
  const c=vm.createContext({S,WORKSPACE_HISTORY:{epoch:1},restore:async()=>{},ensureWorkspaceHistoryIdentity:()=>1,
    optional:name=>defer(name),required:name=>defer(name),loadTasksSafe:()=>defer('tasks'),loadTaskAcknowledgements:()=>defer('acknowledgements'),loadCommentIndex:()=>defer('comment-index'),
    render(){},setupRealtime(){},refreshVisibleHistory(){},mergeCompletionRows:(table,rows)=>rows,dedupeTaskAssignees(){},status(){}});
  vm.runInContext(block,c);const promise=vm.runInContext('load()',c);await tick();
  assert.deepEqual(started.slice().sort(),['app_users','project_members','task_assignees','acknowledgements','task_subtasks','comment-index','projects','tasks'].sort(),'all independent reads start before any resolves');
  assert.ok(!started.includes('project_messages')&&!started.includes('activity_log'));
  pending.forEach(resolve=>resolve());await promise;assert.equal(S.loading,false);
}
(async()=>{await histories();await races();await failures();await overlappingSnapshots();await startup();console.log('Lazy workspace data: parallel startup, counters, >1000-row histories, deduplication, session isolation, retry and snapshot races passed')})().catch(error=>{console.error(error);process.exitCode=1});
