import {
  currentProfile as getCurrentProfile,
  workspaceClient
} from '../../core/workspace-context.js';
import {
  fetchCurrentNotificationUser,
  fetchRecentAssignedTasks,
  fetchRecentTaskAssignees,
  fetchRecentTaskComments
} from '../../services/notifications.service.js';

/* Feature module migrated from assets/modules/notification-rescue.js. Keep dependencies on runtime globals explicit. */
/* polling rescue lite */
(function(){
if(window.__POLLING_RESCUE_LITE__)return;window.__POLLING_RESCUE_LITE__=1;
var me=null,busy=false;
function q(id){return document.getElementById(id)}
function api(){return workspaceClient()}
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function store(){return 'pt_assignment_notifications_v1:'+(me&&me.id||'anonymous')}
function getItems(){try{return JSON.parse(localStorage.getItem(store())||'{"items":[]}').items||[]}catch(e){return[]}}
function setItems(items){try{localStorage.setItem(store(),JSON.stringify({items:items.slice(0,40)}))}catch(e){}}
function css(){if(q('poll-rescue-css'))return;var s=document.createElement('style');s.id='poll-rescue-css';s.textContent='.assignment-badge.hidden{display:none}.assignment-panel.open{display:block}.assignment-empty{padding:18px;color:#64748b;text-align:center}';document.head.appendChild(s)}
function ui(){css();var top=document.querySelector('.top-actions');if(top&&!q('assignmentBell')){var b=document.createElement('button');b.id='assignmentBell';b.type='button';b.className='btn secondary assignment-bell';b.innerHTML='🔔<span class="assignment-badge hidden" id="assignmentBadge">0</span>';top.insertBefore(b,top.firstChild);b.onclick=function(){var p=q('assignmentPanel');if(p)p.classList.toggle('open');markRead()}}if(!q('assignmentPanel')){var p=document.createElement('div');p.id='assignmentPanel';p.className='assignment-panel';p.innerHTML='<div class="assignment-panel-head"><b>Оповещения</b></div><div class="assignment-list" id="assignmentList"></div>';document.body.appendChild(p)}render()}
function render(){var items=getItems(),n=items.filter(function(x){return x.unread}).length,b=q('assignmentBadge'),l=q('assignmentList');if(b){b.textContent=String(n);b.classList.toggle('hidden',!n)}if(l){l.innerHTML=items.length?items.map(function(x){return'<button type="button" class="assignment-item '+(x.unread?'unread':'')+'" data-open-task="'+esc(x.task_id)+'"><div class="assignment-item-title">'+esc(x.type==='mention'?'Упоминание':'Назначение')+'</div><div>'+esc(x.title||'Задача')+'</div></button>'}).join(''):'<div class="assignment-empty">Новых уведомлений пока нет</div>'}}
function markRead(){var a=getItems();a.forEach(function(x){x.unread=false});setItems(a);render()}
function add(type,taskId,title,uniq){var a=getItems();if(a.some(function(x){return x.id===uniq}))return;a.unshift({id:uniq,type:type,task_id:taskId,title:title||'Задача',unread:true,created_at:new Date().toISOString()});setItems(a);ui()}
async function current(c){try{var p=getCurrentProfile();if(p&&p.id)return p;return await fetchCurrentNotificationUser(c)}catch(e){}return null}
function mentioned(body){if(!me)return false;body=String(body||'').toLowerCase();return [me.display_name,me.email].filter(Boolean).some(function(x){return body.indexOf('@'+String(x).toLowerCase())>=0})}
async function sync(){if(busy)return;busy=true;try{var c=api();if(!c)return;me=await current(c);if(!me)return;ui();var since=new Date(Date.now()-7*86400000).toISOString();var tasks=await fetchRecentAssignedTasks(c,since);tasks.filter(function(t){return t.assignee_id===me.id}).forEach(function(t){add('assignment',t.id,t.title,'ta:'+t.id+':'+t.updated_at)});var ar=await fetchRecentTaskAssignees(c,me.id,since);ar.forEach(function(a){var t=tasks.find(function(x){return x.id===a.task_id});add('assignment',a.task_id,t&&t.title,'tas:'+a.id)});var cr=await fetchRecentTaskComments(c,since,80);cr.forEach(function(cm){if(cm.user_id!==me.id&&mentioned(cm.body)){var t=tasks.find(function(x){return x.id===cm.task_id});add('mention',cm.task_id,t&&t.title,'cm:'+cm.id)}});render()}finally{busy=false}}
document.addEventListener('click',function(e){var b=e.target.closest('[data-open-task]');if(!b)return;var id=b.getAttribute('data-open-task');var nav=document.querySelector('.nav button[data-view="tasks"]');if(nav)nav.click();setTimeout(function(){var x=document.createElement('button');x.type='button';x.style.display='none';x.setAttribute('data-action','open-task');x.setAttribute('data-id',id);document.body.appendChild(x);x.click();setTimeout(function(){x.remove()},50)},150)},true);
ui();sync();setInterval(sync,5000);
})();
