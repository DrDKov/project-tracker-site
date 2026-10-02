// Isolated UI fixture: serves the actual application layout with in-memory data.
// It removes all remote scripts/configuration and never connects to production.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const bootstrap = `
css();setupTaskAcknowledgements();
const sampleDay=today();
S.users=[{id:'fixture-owner',display_name:'Дмитрий',role:'owner'},{id:'fixture-member',display_name:'Анна',role:'member'},{id:'fixture-member-2',display_name:'Иван',role:'member'}];
const fixtureRole=new URLSearchParams(location.search).get('role');
S.profile=S.users.find(u=>u.id===(fixtureRole==='member2'?'fixture-member-2':fixtureRole==='member'?'fixture-member':'fixture-owner'));
S.user={id:S.profile.id,email:'demo@example.test'};
S.projects=[{id:'fixture-project',name:'Рабочий проект',color:'#087174'},{id:'fixture-project-2',name:'Личный проект',color:'#b35d32'}];
S.tasks=[{id:'fixture-task',project_id:'fixture-project',title:'Подготовить материалы',status:'planned',priority:'medium',start_date:sampleDay,due_date:sampleDay,assignee_id:'fixture-member',assignee_revision:'fixture-legacy',created_at:sampleDay},{id:'fixture-done',project_id:'fixture-project-2',title:'Завершённая задача',status:'done',priority:'low',start_date:sampleDay,due_date:sampleDay,assignee_id:'fixture-owner',assignee_revision:'fixture-done-legacy',created_at:sampleDay},{id:'fixture-multi',project_id:'fixture-project-2',title:'Согласовать план вместе',status:'planned',priority:'medium',start_date:sampleDay,due_date:sampleDay,assignee_id:'fixture-member',created_at:sampleDay}];
S.assignees=[{id:'fixture-assignment',task_id:'fixture-task',user_id:'fixture-member'},{id:'fixture-assignment-2',task_id:'fixture-multi',user_id:'fixture-member'},{id:'fixture-assignment-3',task_id:'fixture-multi',user_id:'fixture-member-2'}];
S.subtasks=[{id:'fixture-subtask',task_id:'fixture-task',title:'Абдулин — проверить документы',sort_order:1000,completion_state:'not_done',is_done:false},{id:'fixture-subtask-2',task_id:'fixture-task',title:'Записать результат обсуждения',sort_order:2000,completion_state:'partial',is_done:false}];
S.taskBoardMode='week';S.tasksWeekStart=sampleDay;
let fixtureId=0;
S.sb={auth:{onAuthStateChange(){}},async rpc(name,args){if(name==='sync_task_assignees'){S.assignees=S.assignees.filter(a=>a.task_id!==args.p_task||args.p_users.includes(a.user_id));args.p_users.forEach(user_id=>{if(!S.assignees.some(a=>a.task_id===args.p_task&&a.user_id===user_id))S.assignees.push({id:'fixture-new-assignment-'+(++fixtureId),task_id:args.p_task,user_id})});return{data:null,error:null}}if(name==='acknowledge_task'){if(new URLSearchParams(location.search).has('fail_ack'))return{data:null,error:{message:'Тестовая ошибка сети'}};let t=byId(S.tasks,args.p_task);const response=await fetch('/fixture-ack',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task_id:t.id,user_id:S.profile.id,assignment_token:taskAssignmentToken(t,S.profile.id)})});return response.json()}return{data:null,error:null}},from(table){let op='select',row=null,id=null;const query={select(){return this},insert(value){op='insert';row=value;return this},update(value){op='update';row=value;return this},delete(){op='delete';return this},eq(key,value){if(key==='id')id=value;return this},is(){return this},order(){return this},range(){return this},limit(){return this},single(){return this},maybeSingle(){return this},async then(resolve){const list=rtArray(table)||[];let data=list;if(table==='task_acknowledgements'&&op==='select')data=await (await fetch('/fixture-ack')).json();if(op==='insert'){data={...row,id:'fixture-new-'+(++fixtureId)};list.push(data)}if(op==='update'){data=list.find(x=>x.id===id);if(data)Object.assign(data,row)}if(op==='delete'){const index=list.findIndex(x=>x.id===id);if(index>=0)list.splice(index,1);data=null}resolve({data,error:null})}};return query}};
S.rtStatus='SUBSCRIBED';
const fixtureEvents=new EventSource('/fixture-events');fixtureEvents.onmessage=e=>handleRealtimePayload('task_acknowledgements',JSON.parse(e.data));
loadTaskAcknowledgements();
bind();selects();setView('tasks');status('Тестовый режим','Данные хранятся только в памяти');
`;
const receipts=[];
const subscribers=new Set();
const server = http.createServer((req,res) => {
  const url = new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/fixture-events'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache'});res.write(': connected\n\n');subscribers.add(res);req.on('close',()=>subscribers.delete(res));return}
  if(url.pathname==='/fixture-ack'){
    if(req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(receipts));return}
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{const row=JSON.parse(body);res.writeHead(200,{'Content-Type':'application/json'});if(row.user_id!=='fixture-member'&&!(row.user_id==='fixture-member-2'&&row.task_id==='fixture-multi')){res.end(JSON.stringify({data:null,error:{message:'Only assigned user'}}));return}let receipt=receipts.find(x=>x.task_id===row.task_id&&x.user_id===row.user_id&&x.assignment_token===row.assignment_token);if(!receipt){receipt={...row,id:'fixture-receipt-'+(receipts.length+1),acknowledged_at:new Date().toISOString()};receipts.push(receipt);subscribers.forEach(client=>client.write('data: '+JSON.stringify({eventType:'INSERT',new:receipt})+'\n\n'))}res.end(JSON.stringify({data:receipt,error:null}))});return;
  }
  if(url.pathname === '/' || url.pathname === '/index.html'){
    let html = fs.readFileSync(path.join(root,'index.html'),'utf8');
    html = html.replace(/<script>\s*window\.__WORKSPACE_SUPABASE_URL__[\s\S]*?<\/script>/,'');
    html = html.replace(/<script src='https:[^']+'><\/script>/g,'');
    html = html.replace(/<script[^>]*src='assets\/(?:assignment-notifications|notification-polling-rescue-lite|push-notifications)[^']*'[^>]*><\/script>/g,'');
    html = html.replace(/<script src='assets\/app.js[^']*'><\/script>/,"<script type='module' src='/fixture-loader.js'></script>");
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);return;
  }
  if(url.pathname === '/fixture-loader.js'){
    res.writeHead(200,{'Content-Type':'application/javascript'});
    res.end("await import('/assets/app-runtime.js');await Promise.all([import('/assets/workspace-layout.js'),import('/assets/theme-settings.js'),import('/assets/mobile-completed-tasks-toggle.js'),import('/assets/native-pickers.js'),import('/assets/task-comments.js')]);");return;
  }
  const target = path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
  if(!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404);res.end();return}
  let content = fs.readFileSync(target);
  if(url.pathname === '/assets/app-runtime.js'){
    content = content.toString().replace(/async function init\(\)[^\n]+/,bootstrap).replace(/async function load\(\)[^\n]+/,'async function load(){render()}');
  }
  res.writeHead(200,{'Content-Type':target.endsWith('.css')?'text/css':target.endsWith('.js')?'application/javascript':'application/octet-stream'});res.end(content);
});
const port = Number(process.env.PORT) || 8766;
server.listen(port,'127.0.0.1',()=>console.log('Compact UI fixture: http://127.0.0.1:'+port));
