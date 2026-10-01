// Local-only interaction fixture. No connection to the production database.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const rows = [];
const reads = [];
let current = null;
const runtime = () => fs.readFileSync(path.join(root, 'assets/app-runtime.js'), 'utf8');
function fixtureRuntime() {
  const lines = runtime().split(/\r?\n/);
  const names = ['rtId','rtKey','rtArray','rtNewer','rtUpsert','rtRemove','subtaskStructureKey','handleRealtimePayload','subtaskState','nextSubtaskState','subtaskToggleLabel','subs','subBlock','subtaskStatePatch','refreshSubtaskStateUI','flushSubtaskState','cycleSubtask'];
  const source = [
    lines.find(line => line.startsWith('const SUBTASK_STATES=')),
    lines.find(line => line.startsWith('const SUBTASK_STATE_WRITES=')),
    ...names.map(name => { const line = lines.find(line => line.includes('function '+name+'(')); if (!line) throw new Error('Missing fixture function: '+name); return line; }),
    lines.find(line => line.startsWith("document.addEventListener('click',e=>{let check="))
  ].join('\n');
  return `
const $=id=>document.getElementById(id),qa=s=>[...document.querySelectorAll(s)],esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const byId=(a,id)=>a.find(x=>x.id===id),pcolor=()=> '#087174';
const role=new URL(location.href).searchParams.get('role')||'owner';
const profile={id:role==='owner'?'owner-fixture':'member-fixture',role};
const S={subtasks:[{id:'sub-fixture',task_id:'task-fixture',title:'Проверка переключения без мерцания',completion_state:'not_done',is_done:false,created_at:'2026-10-01T10:00:00Z',updated_at:'2026-10-01T10:00:00Z',sort_order:1000}],profile};
let replacementRenders=0,requestCounter=0;
function render(){replacementRenders++;document.getElementById('renderCount').textContent=String(replacementRenders)}
function scheduleRealtimeRender(){render()}
function setRealtimeStatus(){}
function dedupeTaskAssignees(){}
function showSubtaskCopied(){document.getElementById('copyResult').textContent='Скопировано'}
async function copySubtaskTitle(id){await navigator.clipboard.writeText(byId(S.subtasks,id).title);showSubtaskCopied()}
function dbClient(){
  return {auth:{onAuthStateChange(){}},from(table){
    if(table==='task_subtasks')return{update(patch){let id;return{eq(key,value){id=value;return this},select(){return this},async single(){await new Promise(resolve=>setTimeout(resolve,250));const row={...byId(S.subtasks,id),...patch,updated_at:new Date().toISOString()};setTimeout(()=>handleRealtimePayload(table,{eventType:'UPDATE',new:row}),100);return{data:row,error:null}}}}};
    let operation='select',values=null,filters={},count=20;
    const query={select(){return this},eq(key,value){filters[key]=value;return this},is(key,value){filters[key]=value;return this},order(){return this},limit(value){count=value;return this},insert(value){operation='insert';values=value;return this},update(value){operation='update';values=value;return this},upsert(value){operation='upsert';values=value;return this},single(){filters.single=true;return this},maybeSingle(){filters.single=true;return this},async then(resolve,reject){try{const response=await fetch('/fixture-api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({table,operation,values,filters,count,role,userId:profile.id})});resolve(await response.json())}catch(error){reject(error)}}};return query
  },async rpc(name,args){return await (await fetch('/fixture-api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rpc:name,args,role,userId:profile.id})})).json()}};
}
S.sb=dbClient();Object.defineProperties(window,{currentProfile:{get:()=>profile},currentAuth:{get:()=>({id:profile.id})},sb:{get:()=>S.sb}});
` + source + `
document.getElementById('fixtureSubtasks').innerHTML=subBlock({id:'task-fixture',project_id:'project-fixture'});
document.getElementById('fixtureRole').value=role;
document.getElementById('fixtureRole').onchange=e=>location.href='/fixture?role='+e.target.value;
document.getElementById('fixtureTheme').onchange=e=>{document.body.classList.toggle('reference-theme',e.target.value==='soft');document.body.classList.toggle('sketch-theme',e.target.value==='sketch')};
`;
}
const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/assets/app.css"><link rel="stylesheet" href="/assets/reference-theme.css"><link rel="stylesheet" href="/assets/sketch-theme.css"><link rel="stylesheet" href="/assets/workspace-announcements.css"><title>Проверка анонсов</title></head><body class="reference-theme"><main style="max-width:1040px;margin:auto;padding:24px"><h1>Проверка интерфейса</h1><p class="muted">Изолированные тестовые данные</p><div class="row"><label>Пользователь <select class="input" id="fixtureRole"><option value="owner">Владелец</option><option value="member">Участник</option></select></label><label>Стиль <select class="input" id="fixtureTheme"><option value="soft">Тёплый рельефный</option><option value="classic">Классический</option><option value="sketch">Эскизный</option></select></label></div><section class="panel" style="max-width:390px;margin:20px 0"><h3>Подзадачи</h3><div id="fixtureSubtasks"></div><p class="muted">Полные перерисовки: <output id="renderCount">0</output></p><p id="copyResult"></p></section><section id="settings"><div class="settings-grid"></div></section></main><script src="/fixture-runtime.js"></script><script src="/assets/workspace-announcements.js"></script></body></html>`;
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/fixture-api' && req.method === 'POST') {
    let body='';for await(const part of req)body+=part;
    const input=JSON.parse(body);let data=null,error=null;
    if(input.rpc){
      if(input.role!=='owner')error={message:'Only owner'};
      else{const row=rows.find(row=>row.id===input.args.p_announcement_id);if(!row||row.published_at)error={message:'Invalid draft'};else{row.published_at=new Date().toISOString();current={singleton:true,announcement_id:row.id,title:row.title,body:row.body,published_at:row.published_at};data=current}}
    }else if(input.table==='workspace_announcements'){
      if(input.role!=='owner')data=[];
      else if(input.operation==='insert'){data={...input.values,id:'fixture-ann-'+(++rows.length),created_at:new Date().toISOString(),published_at:null};rows[rows.length-1]=data}
      else if(input.operation==='update'){data=rows.find(row=>row.id===input.filters.id&&!row.published_at);if(data)Object.assign(data,input.values)}
      else data=rows.filter(row=>!input.filters.id||row.id===input.filters.id).slice().reverse().slice(0,input.count)
    }else if(input.table==='workspace_announcement_current')data=current;
    else if(input.table==='workspace_announcement_reads'){
      if(input.operation==='upsert'){if(!reads.some(row=>row.user_id===input.values.user_id&&row.announcement_id===input.values.announcement_id))reads.push(input.values);data=null}
      else data=reads.find(row=>row.user_id===input.filters.user_id&&row.announcement_id===input.filters.announcement_id)||null
    }
    res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({data,error}));return;
  }
  if(url.pathname==='/fixture'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);return}
  if(url.pathname==='/fixture-runtime.js'){res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8'});res.end(fixtureRuntime());return}
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end('Not found');return}
  const ext=path.extname(file);
  res.writeHead(200,{'Content-Type':ext==='.js'?'text/javascript; charset=utf-8':ext==='.css'?'text/css; charset=utf-8':'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
});
server.listen(8765,'127.0.0.1',()=>console.log('Interaction fixture: http://127.0.0.1:8765/fixture'));
