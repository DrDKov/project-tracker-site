const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const runtime=fs.readFileSync(path.join(root,'assets/app-runtime.js'),'utf8');
const style=fs.readFileSync(path.join(root,'assets/app.css'),'utf8');
const sql=fs.readFileSync(path.join(root,'supabase/migrations/20261013_planning_inbox.sql'),'utf8');
const script=fs.readFileSync(path.join(root,'assets/planning-inbox.js'),'utf8');
assert.match(html,/Неразобранные задачи/);
assert.doesNotMatch(html,/Фокус недели/);
assert.match(html,/id='planningQuickInput'/);
assert.match(html,/id='openPlanningBtn'/);
assert.match(html,/id='planningDrawer'/);
assert.match(html,/planning-inbox\.js\?v=20261013-planning-inbox-v1/);
assert.match(runtime,/window\.ProjectTrackerPlanning\?\.init/);
assert.match(runtime,/window\.ProjectTrackerPlanning\?\.render/);
assert.doesNotMatch(runtime,/\$('focusList'\)\.innerHTML=\(S\.tasks/);
assert.match(runtime,/data-planning-project/);
assert.match(style,/\.planning-drawer\{position:fixed/);
assert.match(sql,/alter table public\.planning_inbox enable row level security/);
assert.match(sql,/create policy planning_inbox_insert/);
assert.match(sql,/create policy planning_inbox_update/);
assert.match(sql,/create policy planning_inbox_delete/);
assert.match(sql,/Executor has no access to this project/);
assert.match(sql,/Executor lost access to this project/);
assert.match(sql,/for update/);
assert.match(sql,/delete from public\.planning_inbox where id=p_item_id/);
assert.match(sql,/alter publication supabase_realtime add table public\.planning_inbox/);
const events={};
const listen=(name,fn)=>(events[name]??=[]).push(fn);
const dom=new Map();
for(const id of ['planningStatus','planningDrawerStatus','planningCount','planningDrawerCount','focusList','planningDrawerList','planningQuickInput','planningDrawer','openPlanningBtn']){
 dom.set(id,{id,hidden:id==='planningDrawer',textContent:'',innerHTML:'',value:'',attributes:{},setAttribute(k,v){this.attributes[k]=v},focus(){}});
}
const document={
 getElementById:id=>dom.get(id)||null,
 addEventListener:listen,
 querySelector:sel=>sel.includes('data-planning-date')?{value:'2026-10-21'}:null,
 querySelectorAll:()=>[]
};
const user={id:'u1',role:'member'};
const users=[
 {id:'u1',display_name:'Editor',role:'member',is_active:true},
 {id:'u2',display_name:'Participant',role:'member',is_active:true},
 {id:'u3',display_name:'Other owner',role:'member',is_active:true},
 {id:'u4',display_name:'Outsider',role:'member',is_active:true}
];
const projects=[
 {id:'p1',name:'Accessible project',owner_id:'u3'},
 {id:'p2',name:'Other project',owner_id:'u4'}
];
const members=[{project_id:'p1',user_id:'u1',access_role:'editor'},{project_id:'p1',user_id:'u2',access_role:'viewer'}];
let records=[],next=1,promotions=[],lastInserted=null,lastPatch=null;
const clone=o=>({...o});
const client={
 from(table){
  assert.equal(table,'planning_inbox');
  return {
   select(){return this},
   order(){return Promise.resolve({data:records.map(clone),error:null})},
   insert(row){return {select(){return {single:async()=>{
    const saved={...row,id:'item-'+next++,created_at:new Date().toISOString()};
    records.push(saved);lastInserted=saved;return {data:clone(saved),error:null};
   }}}}},
   update(patch){return {eq(key,id){return {select(){return {single:async()=>{
    const index=records.findIndex(x=>x.id===id);
    assert.ok(index>=0);records[index]={...records[index],...patch};lastPatch=patch;
    return {data:clone(records[index]),error:null};
   }}}}}}},
   delete(){return {eq:async(key,id)=>{records=records.filter(x=>x.id!==id);return {error:null}}}}
  };
 },
 async rpc(name,args){
  assert.equal(name,'schedule_planning_item');
  const x=records.find(i=>i.id===args.p_item_id);
  if(!x.project_id)return {error:{message:'Choose a project first'}};
  records=records.filter(i=>i.id!==x.id);
  const task={id:'task-'+x.id,title:x.title,project_id:x.project_id,assignee_id:x.assignee_id,start_date:args.p_date,due_date:args.p_date};
  promotions.push(task);return {data:task,error:null};
 },
 channel(){return {on(){return this},subscribe(){return this}}},
 removeChannel(){}
};
let view='overview';
const window={addEventListener:listen,confirm:()=>true};
vm.runInNewContext(script,{window,document,console,Error,Date});
const api=window.ProjectTrackerPlanning;
api.init({getContext:()=>({view,sb:client,profile:user,users,projects,members}),onScheduled:task=>promotions.push({...task,received:true})});
const pause=()=>new Promise(resolve=>setImmediate(resolve));
const emit=(name,event)=>{for(const fn of events[name]||[])fn(event)};
(async()=>{
 await pause();await pause();
 assert.equal(api.getRows().length,0);
 assert.equal(api.canEditProject(projects[0]),true);
 assert.equal(api.canEditProject(projects[1]),false);
 assert.equal(api.eligibleUsers('p1').some(u=>u.id==='u2'),true);
 assert.equal(api.eligibleUsers('p1').some(u=>u.id==='u4'),false);
 dom.get('planningQuickInput').value='Collect materials\nCall participant';
 emit('click',{target:{closest:sel=>sel==='#planningQuickAdd'?{}:null},preventDefault(){}});
 await pause();await pause();
 assert.equal(api.getRows().length,2,'Each line creates one draft');
 assert.equal(dom.get('planningQuickInput').value,'','Input clears after all inserts');
 assert.ok(dom.get('focusList').innerHTML.includes('Collect materials'));
 assert.ok(!dom.get('focusList').innerHTML.includes('Other project'),'Only editable projects selectable');
 const first=api.getRows()[0];
 const changeField=(name,value)=>emit('change',{target:{closest:sel=>sel==='[data-planning-field]'?{dataset:{planningField:name,id:first.id},value}:null}});
 changeField('project_id','p1');await pause();await pause();
 assert.equal(api.getRows().length,2,'Setting a project must NOT schedule the task');
 assert.equal(api.getRows()[0].project_id,'p1');
 changeField('assignee_id','u2');await pause();await pause();
 assert.equal(api.getRows()[0].assignee_id,'u2');
 changeField('assignee_id','u4');await pause();await pause();
 assert.equal(api.getRows()[0].assignee_id,'u2','Ineligible assignee is rejected');
 assert.match(dom.get('planningStatus').textContent,/нет доступа/i);
 api.open();assert.equal(dom.get('planningDrawer').hidden,false);
 assert.match(dom.get('planningDrawerList').innerHTML,/data-planning-schedule/);
 emit('click',{target:{closest:sel=>sel==='[data-planning-schedule]'?{dataset:{planningSchedule:first.id}}:null},preventDefault(){}});
 await pause();await pause();
 assert.equal(api.getRows().length,1,'Scheduled draft disappears from inbox');
 assert.equal(promotions[0].project_id,'p1');
 assert.equal(promotions[0].assignee_id,'u2');
 assert.equal(promotions[0].due_date,'2026-10-21');
 assert.equal(promotions[1].received,true,'Existing tasks UI is updated');
 api.close();assert.equal(dom.get('planningDrawer').hidden,true);
 api.reset();assert.equal(api.getRows().length,0);
 console.log('Planning capture, per-project assignees, inbox persistence, scheduling and drawer tests passed');
})().catch(err=>{console.error(err);process.exitCode=1});
