const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),runtime=fs.readFileSync(path.join(root,'assets/app-runtime.js'),'utf8');
const authSource=runtime.slice(runtime.indexOf('let authEpoch='),runtime.indexOf('/* Realtime sync v112 start */'));
function authHarness(){
  const events=[],status=[],S={user:{id:'owner'},profile:{id:'profile-owner'},users:[],members:[],assignees:[],subtasks:[],projects:[],tasks:[],acknowledgements:[]};
  let session={data:{session:{user:{id:'owner',email:'demo@example.test'}}},error:null},profile={data:{id:'profile-owner',auth_user_id:'owner',is_active:true,role:'owner'},error:null},callback;
  S.sb={auth:{getSession:async()=>session,onAuthStateChange:fn=>{callback=fn},signOut:async()=>({error:null})},from(){return{select(){return this},eq(){return this},maybeSingle:async()=>profile}}};
  const c=vm.createContext({S,sb:()=>S.sb,withTimeout:p=>p,resetWorkspaceHistory(){},teardownRealtime(){},render(){},status:(...a)=>status.push(a),$:()=>null,window:{dispatchEvent:e=>events.push(e),addEventListener(){}},document:{hidden:false,addEventListener(){}},navigator:{onLine:true},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},setTimeout:()=>1,clearTimeout(){},load(){},console});
  vm.runInContext(authSource,c);return{S,c,events,status,session:r=>session=r,profile:r=>profile=r,call:code=>vm.runInContext(code,c)};
}
function draftHarness(){
  const elements={},events={};
  for(const id of ['taskId','taskTitle','taskProject','taskAssignee','taskStatus','taskPriority','taskStart','taskDue','taskNotes','taskAllDay','taskStartTime','taskEndTime','taskDurationMinutes','taskRepeatEnabled','taskRepeatType','taskRepeatUntil','taskCommentText','taskDraftStatus','taskDraftRestore','taskDraftRestoreText'])elements[id]={value:'',type:'text',tagName:'INPUT',hidden:true,dispatchEvent(){}};
  elements.taskAssignee.multiple=true;elements.taskAssignee.selectedOptions=[];elements.taskAssignee.options=[];elements.taskModal={close(){}};
  const storage={getItem(k){return this[k]??null},setItem(k,v){this[k]=v},removeItem(k){delete this[k]}};
  // Storage methods must not be enumerated as actual keys.
  for(const k of ['getItem','setItem','removeItem'])Object.defineProperty(storage,k,{value:storage[k],enumerable:false,writable:true});
  const window={currentAuth:{id:'owner'},tasks:[],sb:{supabaseUrl:'https://fixture.test'},addEventListener:(type,fn)=>events[type]=fn,dispatchEvent:e=>events[e.type]?.(e)};
  const c=vm.createContext({window,location:{origin:'https://fixture.test'},document:{readyState:'loading',getElementById:id=>elements[id],querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}},localStorage:storage,Date,JSON,Array,Set,Object,Event:class{},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},setTimeout:()=>1,clearTimeout(){}});
  let source=fs.readFileSync(path.join(root,'assets/workspace-reliability.js'),'utf8').replace('window.ProjectTrackerDrafts={','window.testRestore=restoreDraft;window.ProjectTrackerDrafts={');
  vm.runInContext(source,c);return{window,elements,storage,events,api:window.ProjectTrackerDrafts,keys:()=>Object.keys(storage)};
}
(async()=>{
  const a=authHarness();a.session({data:{session:null},error:{name:'AuthRetryableFetchError',message:'Failed to fetch',status:503}});
  await assert.rejects(a.call('restore()'));assert.equal(a.S.user.id,'owner');assert.equal(a.S.profile.id,'profile-owner');assert.equal(a.S.authRecovering,true);assert.equal(a.events.length,0,'network failure never logs out');
  a.session({data:{session:{user:{id:'owner',email:'demo@example.test'}}},error:null});await a.call('restore()');assert.equal(a.S.authRecovering,false);
  a.profile({data:null,error:{message:'NetworkError',status:503}});await assert.rejects(a.call('restore()'));assert.equal(a.S.profile.id,'profile-owner','profile fetch failure preserves known identity');
  a.session({data:null,error:{code:'refresh_token_not_found',message:'Expired session',status:401}});await assert.rejects(a.call('restore()'));assert.equal(a.S.user,null);assert.equal(a.events[0].detail.clearDrafts,false,'expired session keeps isolated drafts');
  const b=authHarness();let resolve;b.S.sb.auth.getSession=()=>new Promise(r=>resolve=r);const first=b.call('restore()'),second=b.call('restore()');b.call('clearWorkspaceSession(true)');resolve({data:{session:{user:{id:'owner'}}}});await Promise.all([first,second]);assert.equal(b.S.user,null,'late session result cannot undo logout');
  const h=draftHarness();h.api.opened();h.elements.taskTitle.value='Draft';h.elements.taskNotes.value='Notes';h.elements.taskCommentText.value='Comment';h.api.setCommentContext('subtask');assert.equal(h.api.capture(),true);let ownerKey=h.keys()[0];assert.ok(ownerKey.includes(':owner:new'));
  h.api.beforeOpen();h.elements.taskTitle.value='';h.elements.taskNotes.value='';h.elements.taskCommentText.value='';h.api.opened();assert.equal(h.elements.taskDraftRestore.hidden,false);assert.equal(h.api.capture(),false,'pending restore cannot be overwritten by empty defaults');h.window.testRestore();assert.equal(h.elements.taskTitle.value,'Draft');assert.equal(h.elements.taskCommentText.value,'Comment');
  const token=h.api.token();h.elements.taskCommentText.value='New text while sending';h.api.commentSaved(token,'Comment');assert.equal(h.elements.taskCommentText.value,'New text while sending','late send never erases newer typing');
  h.api.beforeOpen();h.window.currentAuth={id:'nurse'};h.elements.taskTitle.value='';h.elements.taskNotes.value='';h.elements.taskCommentText.value='';h.api.opened();assert.equal(h.elements.taskDraftRestore.hidden,true,'another user never sees owner draft');h.elements.taskTitle.value='Nurse draft';h.api.capture();assert.equal(h.keys().length,2);
  h.events['pt-session-ended']({detail:{userId:'nurse',clearDrafts:true}});assert.equal(h.keys().length,1);assert.equal(h.keys()[0],ownerKey,'explicit logout clears only that user drafts');
  h.window.currentAuth={id:'owner'};h.elements.taskTitle.value='';h.api.opened();h.window.testRestore();h.api.discard();assert.equal(h.keys().length,0);
  h.api.opened();h.elements.taskTitle.value='Storage failure';h.storage.setItem=()=>{throw Error('Quota exceeded')};assert.equal(h.api.capture(),false);assert.match(h.elements.taskDraftStatus.textContent,/Не удалось/);
  assert.doesNotMatch(authSource,/localStorage\.removeItem/,'Auth must not wipe refresh tokens on network errors');
  const canonical=fs.readFileSync(path.join(root,'.github/scripts/task-save-handler.js'),'utf8').replace(/\r\n/g,'\n').split('\n').slice(1).join('\n').trim();assert.ok(runtime.replace(/\r\n/g,'\n').includes(canonical),'deploy transform preserves the draft-aware canonical save handler');
  const fields={};for(const id of ['taskId','taskTitle','taskProject','taskStatus','taskPriority','taskStart','taskDue','taskNotes'])fields[id]={value:''};fields.taskTitle.value='Test create';fields.taskProject.value='project';let inserts=0,updates=0,syncs=0,cleared=0,closed=0;
  fields.taskModal={close(){closed++}};
  const saveState={user:{id:'owner'},tasks:[],sb:{from(){return{
    insert(row){inserts++;return{select(){return this},single:async()=>({data:{...row,id:'created-task'},error:null})}},
    update(row){updates++;return{eq(){return this},select(){return this},single:async()=>({data:{...row,id:'created-task'},error:null})}}
  }}}};
  const saveContext=vm.createContext({S:saveState,window:{ProjectTrackerDrafts:{token:()=>({key:'new-draft'}),capture(){},beginAction(){},persisted(){},saved(){cleared++}}},$:id=>fields[id],qa:()=>[],ensureTaskCalendarUi(){},readTaskCalendarFields:()=>({}),taskRecurrenceEnabled:()=>false,byId:(rows,id)=>rows.find(r=>r.id===id),syncTaskAssignees:async()=>{if(++syncs===1)throw Error('Assignment sync failed')},rtUpsert:(table,row)=>saveState.tasks.push(row),load:async()=>{},alert(){}});
  vm.runInContext(canonical,saveContext);
  await assert.rejects(vm.runInContext('saveTask({preventDefault(){}})',saveContext),/Assignment sync failed/);assert.equal(fields.taskId.value,'created-task');assert.equal(cleared,0);assert.equal(closed,0,'failed save keeps draft and editor');
  await vm.runInContext('saveTask({preventDefault(){}})',saveContext);assert.equal(inserts,1);assert.equal(updates,1,'retry updates the confirmed task instead of inserting a duplicate');assert.equal(cleared,1);assert.equal(closed,1);
  const reliability=fs.readFileSync(path.join(root,'assets/workspace-reliability.js'),'utf8');assert.match(reliability,/__PT_WORKSPACE_UNDO_ENABLED__!==true/,'Undo stays disabled until production approval and verification');
  const migration=fs.readFileSync(path.join(root,'supabase/migrations/20261010223405_safe_workspace_undo.sql'),'utf8');assert.match(migration,/security invoker/);assert.match(migration,/auth_user_id=\(select auth\.uid\(\)\)/);assert.match(migration,/is distinct from r.after_row/);assert.match(migration,/for update of tasks/);assert.match(migration,/revoke all on private.workspace_undo_receipts/);
  console.log('Reliability checks passed: transient/returned Auth errors, profile recovery, expired session, stale logout; draft/task/user isolation, restore, comment races, explicit cleanup, storage failure and deployment persistence');
})().catch(e=>{console.error(e);process.exitCode=1});
