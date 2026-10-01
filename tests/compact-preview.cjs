// Isolated UI fixture: serves the actual application layout with in-memory data.
// It removes all remote scripts/configuration and never connects to production.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const bootstrap = `
css();
const sampleDay=today();
S.user={id:'fixture-owner',email:'demo@example.test'};
S.profile={id:'fixture-owner',display_name:'Дмитрий',role:'owner'};
S.users=[S.profile,{id:'fixture-member',display_name:'Анна',role:'member'}];
S.projects=[{id:'fixture-project',name:'Рабочий проект',color:'#087174'},{id:'fixture-project-2',name:'Личный проект',color:'#b35d32'}];
S.tasks=[{id:'fixture-task',project_id:'fixture-project',title:'Подготовить материалы',status:'planned',priority:'medium',start_date:sampleDay,due_date:sampleDay,assignee_id:S.profile.id,created_at:sampleDay},{id:'fixture-done',project_id:'fixture-project-2',title:'Завершённая задача',status:'done',priority:'low',start_date:sampleDay,due_date:sampleDay,assignee_id:S.profile.id,created_at:sampleDay}];
S.subtasks=[{id:'fixture-subtask',task_id:'fixture-task',title:'Абдулин — проверить документы',sort_order:1000,completion_state:'not_done',is_done:false},{id:'fixture-subtask-2',task_id:'fixture-task',title:'Записать результат обсуждения',sort_order:2000,completion_state:'partial',is_done:false}];
S.taskBoardMode='week';S.tasksWeekStart=sampleDay;
let fixtureId=0;
S.sb={auth:{onAuthStateChange(){}},from(table){let op='select',row=null,id=null;const query={select(){return this},insert(value){op='insert';row=value;return this},update(value){op='update';row=value;return this},delete(){op='delete';return this},eq(key,value){if(key==='id')id=value;return this},is(){return this},order(){return this},limit(){return this},single(){return this},maybeSingle(){return this},async then(resolve){const list=rtArray(table)||[];let data=list;if(op==='insert'){data={...row,id:'fixture-new-'+(++fixtureId)};list.push(data)}if(op==='update'){data=list.find(x=>x.id===id);if(data)Object.assign(data,row)}if(op==='delete'){const index=list.findIndex(x=>x.id===id);if(index>=0)list.splice(index,1);data=null}resolve({data,error:null})}};return query}};
bind();selects();setView('tasks');status('Тестовый режим','Данные хранятся только в памяти');
`;
const server = http.createServer((req,res) => {
  const url = new URL(req.url,'http://127.0.0.1');
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
    res.end("await import('/assets/app-runtime.js');await Promise.all([import('/assets/workspace-layout.js'),import('/assets/theme-settings.js'),import('/assets/mobile-completed-tasks-toggle.js'),import('/assets/native-pickers.js')]);");return;
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
server.listen(8766,'127.0.0.1',()=>console.log('Compact UI fixture: http://127.0.0.1:8766'));
