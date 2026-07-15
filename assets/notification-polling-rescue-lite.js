/* polling rescue v2: reconciles missed notifications without resetting unread state. */
(function(){
if(window.__POLLING_RESCUE_V2__)return;window.__POLLING_RESCUE_V2__=1;window.__POLLING_RESCUE_LITE__=1;
var me=null,busy=false;
var EPOCH='1970-01-01T00:00:00.000Z';
function q(id){return document.getElementById(id)}
function api(){try{return window.sb||null}catch(e){return null}}
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function store(){return 'pt_assignment_notifications_v1:'+(me&&me.id||'anonymous')}
function time(v){var t=Date.parse(v||'');return Number.isFinite(t)?t:0}
function normalize(items){
  var seen={};
  return (Array.isArray(items)?items:[]).filter(function(x){
    if(!x||!x.task_id)return false;
    var key=x.type==='mention'?(x.id||('mention:'+x.task_id)):'assignment-task:'+x.task_id;
    if(seen[key])return false;
    seen[key]=1;
    return true;
  }).slice(0,40);
}
function getState(){try{var x=JSON.parse(localStorage.getItem(store())||'{}');return{items:normalize(x.items),read_before:x.read_before||EPOCH}}catch(e){return{items:[],read_before:EPOCH}}}
function setState(value){try{value=value||{};localStorage.setItem(store(),JSON.stringify({items:normalize(value.items),read_before:value.read_before||EPOCH}))}catch(e){}}
function applyReadBefore(value){
  var cutoff=time(value.read_before);
  value.items.forEach(function(x){if(x&&time(x.created_at)<=cutoff)x.unread=false});
  return value;
}
function css(){if(q('poll-rescue-css'))return;var s=document.createElement('style');s.id='poll-rescue-css';s.textContent='.assignment-badge.hidden{display:none}.assignment-panel.open{display:block}.assignment-empty{padding:18px;color:#64748b;text-align:center}.assignment-panel-head button[disabled]{opacity:.5;cursor:default}';document.head.appendChild(s)}
function ui(){
  if(window.__ASSIGNMENT_NOTIFICATIONS_V3__)return;
  css();
  var top=document.querySelector('.top-actions');
  if(top&&!q('assignmentBell')){
    var b=document.createElement('button');
    b.id='assignmentBell';b.type='button';b.className='btn secondary assignment-bell';b.title='Оповещения о назначениях и упоминаниях';
    b.innerHTML='🔔<span class="assignment-badge hidden" id="assignmentBadge">0</span>';
    top.insertBefore(b,top.firstChild);
    b.onclick=function(){var p=q('assignmentPanel');if(p)p.classList.toggle('open')};
  }
  if(!q('assignmentPanel')){
    var p=document.createElement('div');
    p.id='assignmentPanel';p.className='assignment-panel';
    p.innerHTML='<div class="assignment-panel-head"><b>Оповещения</b><button type="button" data-assignment-clear>Отметить все прочитанными</button></div><div class="assignment-list" id="assignmentList"></div>';
    document.body.appendChild(p);
  }else{
    var head=q('assignmentPanel').querySelector('.assignment-panel-head');
    if(head&&!head.querySelector('[data-assignment-clear]')){
      var clear=document.createElement('button');clear.type='button';clear.setAttribute('data-assignment-clear','');clear.textContent='Отметить все прочитанными';head.appendChild(clear);
    }
  }
  render();
}
function render(){
  if(window.__ASSIGNMENT_NOTIFICATIONS_V3__){window.dispatchEvent(new CustomEvent('pt-notification-store-changed'));return}
  var value=applyReadBefore(getState()),items=value.items,n=items.filter(function(x){return x&&x.unread}).length;
  setState(value);
  var b=q('assignmentBadge'),l=q('assignmentList'),clear=document.querySelector('[data-assignment-clear]');
  if(b){b.textContent=n>99?'99+':String(n);b.classList.toggle('hidden',!n)}
  if(clear){clear.textContent='Отметить все прочитанными';clear.disabled=!n}
  if(l){l.innerHTML=items.length?items.map(function(x){return'<button type="button" class="assignment-item '+(x.unread?'unread':'')+'" data-open-task="'+esc(x.task_id)+'"><div class="assignment-item-title">'+esc(x.type==='mention'?'Упоминание':'Назначение')+'</div><div>'+esc(x.title||'Задача')+'</div></button>'}).join(''):'<div class="assignment-empty">Уведомлений пока нет</div>'}
}
async function saveRemote(value){
  var c=api();if(!c||!me||!me.id)return;
  try{var r=await c.from('notification_read_state').upsert({user_id:me.id,read_before:value.read_before,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(r.error)throw r.error}catch(e){console.warn('Notification read state save failed',e)}
}
async function loadRemote(c){
  if(!c||!me||!me.id)return;
  try{
    var r=await c.from('notification_read_state').select('read_before').eq('user_id',me.id).maybeSingle();
    if(!r.error&&r.data){
      var value=getState();
      if(time(r.data.read_before)>time(value.read_before)){value.read_before=r.data.read_before;applyReadBefore(value);setState(value)}
    }
  }catch(e){console.warn('Notification read state load failed',e)}
}
function markRead(){
  var value=getState();value.read_before=new Date().toISOString();value.items.forEach(function(x){if(x)x.unread=false});setState(value);render();saveRemote(value)
}
function markTaskRead(taskId){
  var value=getState();value.items.forEach(function(x){if(x&&x.task_id===taskId)x.unread=false});setState(value);render()
}
function add(type,taskId,title,uniq,createdAt){
  var value=applyReadBefore(getState()),existing=value.items.find(function(x){return x&&x.id===uniq});
  if(existing){existing.title=title||existing.title;existing.created_at=createdAt||existing.created_at;setState(value);return}
  var item={id:uniq,type:type,task_id:taskId,title:title||'Задача',created_at:createdAt||new Date().toISOString(),unread:true};
  if(time(item.created_at)<=time(value.read_before))item.unread=false;
  if(type!=='mention')value.items=value.items.filter(function(x){return x&&!(x.type!=='mention'&&x.task_id===taskId)});
  value.items.unshift(item);setState(value)
}
async function current(c){try{var p=window.currentProfile;if(p&&p.id)return p;var r=await c.rpc('current_app_user_id');if(r.data){var u=await c.from('app_users').select('id,display_name,email').eq('id',r.data).maybeSingle();return u.data}}catch(e){}return null}
function mentioned(body){if(!me)return false;body=String(body||'').toLowerCase();return[me.display_name,me.email].filter(Boolean).some(function(x){return body.indexOf('@'+String(x).toLowerCase())>=0})}
async function sync(){
  if(busy)return;busy=true;
  try{
    var c=api();if(!c)return;
    me=await current(c);if(!me)return;
    ui();await loadRemote(c);
    var since=new Date(Date.now()-7*86400000).toISOString(),tasks=[],assignments=[];
    var tr=await c.from('tasks').select('id,title,assignee_id,created_at,updated_at').gte('updated_at',since);
    if(!tr.error&&tr.data)tasks=tr.data;
    var ar=await c.from('task_assignees').select('id,task_id,created_at').eq('user_id',me.id).gte('created_at',since);
    if(!ar.error&&ar.data)assignments=ar.data;
    var multiTaskIds=new Set(assignments.map(function(a){return a.task_id}));
    assignments.forEach(function(a){var t=tasks.find(function(x){return x.id===a.task_id});add('assignment',a.task_id,t&&t.title,'assignment:'+a.id,a.created_at)});
    tasks.filter(function(t){return t.assignee_id===me.id&&!multiTaskIds.has(t.id)}).forEach(function(t){add('assignment',t.id,t.title,'assignment:direct:'+t.id,t.updated_at||t.created_at)});
    var cr=await c.from('task_comments').select('id,task_id,body,user_id,created_at').gte('created_at',since).limit(80);
    if(!cr.error&&cr.data)cr.data.forEach(function(cm){if(cm.user_id!==me.id&&mentioned(cm.body)){var t=tasks.find(function(x){return x.id===cm.task_id});add('mention',cm.task_id,t&&t.title,'mention:'+cm.id+':'+cm.task_id,cm.created_at)}});
    render();
  }finally{busy=false}
}
document.addEventListener('click',function(e){
  if(e.target.closest('[data-assignment-clear]')){if(window.__ASSIGNMENT_NOTIFICATIONS_V3__)return;e.preventDefault();markRead();return}
  var b=e.target.closest('[data-open-task]');if(!b)return;
  var id=b.getAttribute('data-open-task');markTaskRead(id);
  var nav=document.querySelector('.nav button[data-view="tasks"]');if(nav)nav.click();
  setTimeout(function(){var x=document.createElement('button');x.type='button';x.style.display='none';x.setAttribute('data-action','open-task');x.setAttribute('data-id',id);document.body.appendChild(x);x.click();setTimeout(function(){x.remove()},50)},150)
},true);
ui();sync();setInterval(sync,5000);
})();
