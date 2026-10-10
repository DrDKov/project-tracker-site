const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '../assets', name), 'utf8');
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return {promise, resolve}; }
function emitter() {
  const handlers = new Map();
  return {addEventListener(name, fn) { if (!handlers.has(name)) handlers.set(name, []); handlers.get(name).push(fn); },
    dispatchEvent(event) { for (const fn of handlers.get(event.type) || []) fn(event); }};
}
function mockClient() {
  const calls = [], data = new Map();
  return {calls, data, from(table) {
    const call = {table, filters: []}; calls.push(call);
    const query = {select(columns) { call.columns = columns; return this; },
      eq(...args) { call.filters.push(args); return this; }, gte(...args) { call.filters.push(args); return this; },
      is(...args) { call.filters.push(args); return this; }, order(...args) { call.order = args; return this; },
      limit(n) { call.limit = n; return this; }, maybeSingle() { return this; },
      abortSignal(signal) {call.signal=signal;return this;},
      then(resolve, reject) {
        const result=Promise.resolve(data.get(table)||{data:[]});
        const aborted=call.signal&&new Promise(done=>{const abort=()=>done({error:{message:'aborted'}});call.signal.aborted?abort():call.signal.addEventListener('abort',abort,{once:true});});
        return (aborted?Promise.race([result,aborted]):result).then(resolve,reject);
      }};
    return query;
  }};
}
function pollingHarness() {
  const client = mockClient(), store = new Map(), timers = new Map(); let sequence = 0, renders = 0;
  const window = Object.assign(emitter(), {sb: client, currentAuth:{id:'auth-a'}, currentProfile:{id:'user-a',display_name:'Alice'},
    __ASSIGNMENT_NOTIFICATIONS_V3__:1, __PT_NOTIFICATION_REALTIME__:{profileId:'user-a',status:'SUBSCRIBED'}});
  window.addEventListener('pt-notification-store-changed', () => renders++);
  const document = Object.assign(emitter(), {visibilityState:'visible'});
  const context = vm.createContext({window, document, navigator:{onLine:true}, console:{warn(){}}, Date, Set, AbortController,
    CustomEvent:class {constructor(type) {this.type=type;}},
    localStorage:{getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)},
    setTimeout(fn, delay) { const id=++sequence;timers.set(id,{fn,delay});return id; },clearTimeout:id=>timers.delete(id)});
  vm.runInContext(read('notification-polling-rescue-lite.js'),context);
  return {client, window, document, context, store, timers, renders:()=>renders,
    async tick() { const [id,timer]=[...timers.entries()].at(-1);timers.delete(id);timer.fn();await flush(); },
    state(id='user-a') { return JSON.parse(store.get('pt_assignment_notifications_v1:'+id)||'{}'); }};
}

(async () => {
  const runtime=read('app-runtime.js'), events=emitter();let contextEvents=0;
  events.addEventListener('pt-workspace-context-changed',()=>contextEvents++);
  const core={user:null,profile:null,view:'tasks'};
  const cc=vm.createContext({S:core,window:events,CustomEvent:class {constructor(type){this.type=type;}}});
  vm.runInContext(runtime.slice(runtime.indexOf('/* Optional modules react to context changes'),runtime.indexOf('function render(){')),cc);
  cc.publishWorkspaceContext();cc.publishWorkspaceContext();assert.equal(contextEvents,1,'unchanged rendering does not notify optional modules');
  core.user={id:'auth'};core.profile={id:'owner',role:'owner'};cc.publishWorkspaceContext();assert.equal(contextEvents,2);
  core.view='settings';cc.publishWorkspaceContext();assert.equal(contextEvents,3,'view entry reaches lazy modules');
  core.user=null;core.profile=null;cc.publishWorkspaceContext();assert.equal(contextEvents,4,'logout reaches optional module cleanup');
  const h=pollingHarness();await flush();
  assert.equal(h.client.calls.length,4,'one reconciliation has four independent reads');
  assert.equal([...h.timers.values()].at(-1).delay,15000,'healthy realtime retains a slower backup poll');
  assert.equal(h.renders(),0,'unchanged polling does not rebuild the notification panel');
  const commentRead=h.client.calls.find(c=>c.table==='task_comments');
  assert.equal(commentRead.order[0],'created_at');assert.equal(commentRead.order[1].ascending,false);
  h.client.data.set('tasks',{data:[{id:'task-a',title:'Task',updated_at:new Date().toISOString()}]});
  h.client.data.set('task_assignees',{data:[{id:'assign-a',task_id:'task-a',created_at:new Date().toISOString()}]});
  h.client.data.set('task_comments',{data:[{id:'comment-a',task_id:'task-a',user_id:'user-b',body:'@Alice hello',created_at:new Date().toISOString()}]});
  await h.tick();assert.equal(h.state().items.length,2,'assignments and mentions are both recovered');
  assert.equal(h.renders(),1);
  const stored=h.state();stored.items.forEach(item=>item.unread=false);
  h.store.set('pt_assignment_notifications_v1:user-a',JSON.stringify(stored));
  await h.tick();assert.ok(h.state().items.every(x=>!x.unread),'repeated snapshots never reactivate read items');
  assert.equal(h.renders(),1,'identical read state does not trigger another render');
  h.client.data.set('task_assignees',{data:[{id:'assign-old',task_id:'task-a',created_at:'2020-01-01T00:00:00Z'},...h.client.data.get('task_assignees').data]});
  await h.tick();assert.ok(h.state().items.every(x=>!x.unread),'older assignments cannot reactivate a newer read notification');
  h.window.__PT_NOTIFICATION_REALTIME__.status='CHANNEL_ERROR';
  h.window.dispatchEvent({type:'pt-notification-realtime-status'});
  assert.equal([...h.timers.values()].at(-1).delay,0,'connection failure triggers immediate reconciliation');
  await h.tick();assert.equal([...h.timers.values()].at(-1).delay,5000,'failed realtime uses fast fallback');
  h.client.data.set('tasks',{error:{message:'failed'}});await h.tick();
  assert.equal(h.state().items.length,2,'query failures do not erase existing notifications');
  h.document.visibilityState='hidden';h.document.dispatchEvent({type:'visibilitychange'});
  assert.equal(h.timers.size,0,'hidden tab has no polling timer');
  h.document.visibilityState='visible';h.document.dispatchEvent({type:'visibilitychange'});
  assert.equal([...h.timers.values()].at(-1).delay,0,'return to tab checks missed events immediately');
  h.context.navigator.onLine=false;h.window.dispatchEvent({type:'offline'});assert.equal(h.timers.size,0);
  h.context.navigator.onLine=true;h.window.dispatchEvent({type:'online'});assert.equal([...h.timers.values()].at(-1).delay,0);

  const hung=pollingHarness();await flush();hung.client.data.set('tasks',deferred().promise);
  await hung.tick();assert.equal(hung.timers.size,1,'a pending batch keeps only its deadline');
  await hung.tick();assert.ok(hung.client.calls.at(-2).signal.aborted,'deadline aborts the stalled request');
  assert.equal([...hung.timers.values()].at(-1).delay,5000,'timeout releases polling and enables fast retry');

  const race=pollingHarness();await flush();const pending=deferred();
  race.client.data.set('tasks',pending.promise);race.client.data.set('task_assignees',{data:[{id:'old-assignment',task_id:'old-task',created_at:new Date().toISOString()}]});
  const timer=[...race.timers.values()].at(-1);race.timers.clear();timer.fn();await flush();
  race.window.currentAuth={id:'auth-b'};race.window.currentProfile={id:'user-b',display_name:'Bob'};
  race.window.dispatchEvent({type:'pt-workspace-context-changed'});
  pending.resolve({data:[{id:'old-task',title:'Old user task'}]});await flush();
  assert.equal(race.store.has('pt_assignment_notifications_v1:user-b'),false,'old responses cannot write another user store');
  assert.equal([...race.timers.values()].at(-1).delay,0,'new identity is reconciled after the old in-flight read');
  race.client.data.set('tasks',{data:[]});race.client.data.set('task_assignees',{data:[]});await race.tick();
  race.window.currentAuth=null;race.window.currentProfile=null;race.window.dispatchEvent({type:'pt-workspace-context-changed'});
  const reads=race.client.calls.length;await race.tick();assert.equal(race.client.calls.length,reads,'logged out users do not poll private data');

  const materials=read('materials-v2.js');
  const loadBlock=materials.slice(materials.indexOf('  function loadAll(){'),materials.indexOf('  function fTemplates()'));
  const tickBlock=materials.slice(materials.indexOf('  function tick(){'),materials.indexOf("  window.addEventListener('pt-workspace-context-changed'"));
  const client=mockClient();
  const S={sb:client,me:{id:'owner'},owner:true,session:'auth:owner:owner',generation:1,templates:[],folders:[],files:[],pending:null,loadedAt:0};
  const window={currentAuth:{id:'auth'}}, profile={id:'owner',role:'owner'};
  const ctx=vm.createContext({S,window,Date,Promise,AbortController,setTimeout,clearTimeout,render(){},nav(){},err(){},prof:()=>profile,api:()=>client,$:()=>null,document:{querySelector:()=>null}});
  vm.runInContext(loadBlock+tickBlock,ctx);ctx.tick();assert.equal(client.calls.length,0,'materials never load on owner startup');
  const a=ctx.loadAll(),b=ctx.loadAll();assert.equal(a,b,'opening materials shares an in-flight read');
  assert.equal(client.calls.length,3,'three material sources are started together');await a;assert.ok(S.loadedAt);
  const blocked=deferred();client.data.set('material_files',blocked.promise);
  S.templates=[{id:'kept'}];const failed=ctx.loadAll();blocked.resolve({error:{message:'failed'}});
  await assert.rejects(failed,/failed/);assert.equal(S.loading,false);assert.equal(S.pending,null);assert.equal(S.templates[0].id,'kept','failed refresh preserves loaded data');
  const old=deferred();client.data.set('material_files',old.promise);const stale=ctx.loadAll();
  S.generation++;S.templates=[];old.resolve({data:[{id:'private-old-file'}]});await stale;
  assert.equal(S.templates.length,0,'late materials read is discarded after identity change');

  const announcements=read('workspace-announcements.js');
  assert.doesNotMatch(announcements,/observe\(document\.body/,'announcements do not scan all workspace mutations');
  assert.match(announcements,/observe\(settings, \{ attributes: true, attributeFilter: \['class'\]/);
  const visibleBlock=announcements.slice(announcements.indexOf('  function loadVisibleHistory()'),announcements.indexOf('  function boot()'));
  let active=false,historyReads=0;const announcementState={session:'owner',historyLoadedAt:0};
  const ac=vm.createContext({state:announcementState,Date,isOwner:()=>true,byId:()=>({classList:{contains:()=>active}}),loadHistory:()=>historyReads++});
  vm.runInContext(visibleBlock,ac);ac.loadVisibleHistory();assert.equal(historyReads,0,'announcement history is lazy');
  active=true;ac.loadVisibleHistory();assert.equal(historyReads,1);
  announcementState.historyLoadedAt=Date.now();ac.loadVisibleHistory();assert.equal(historyReads,1,'fresh history is reused');

  const primary=read('assignment-notifications.js');
  assert.doesNotMatch(primary,/setInterval\(rebindProfile/);
  assert.match(primary,/if\(!window\.__POLLING_RESCUE_LITE__\)/,'only one module owns periodic read-state reconciliation');
  const pushBlock=primary.slice(primary.indexOf('  function pushItem('),primary.indexOf('  function pulseBell('));
  const pc=vm.createContext({state:{items:[{id:'mention:c:t',type:'mention',task_id:'t',unread:false}],readBefore:'1970-01-01',unread:0},Date,MAX_ITEMS:40,
    readTime:Date.parse,projectName:()=>'',saveStore(){},ensureUi(){},pulseBell(){throw Error('duplicate toast')},showToast(){throw Error('duplicate toast')}});
  vm.runInContext(pushBlock,pc);pc.pushItem('mention',{id:'t',title:'Task'},{comment_id:'c',created_at:new Date().toISOString()});
  assert.equal(pc.state.items[0].unread,false,'late realtime event cannot make an existing notification unread');
  console.log('Background checks passed: adaptive polling, visibility/offline recovery, stable unread state, session races, lazy materials and announcement history');
})().catch(e=>{console.error(e);process.exitCode=1;});
