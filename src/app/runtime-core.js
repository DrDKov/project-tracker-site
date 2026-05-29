import { appStore, exposeAppStore } from '../core/state/store.js';
import {
  fetchProfileByEmail,
  removeProjectMember
} from '../services/workspace.service.js';
import {
  saveTaskOrder,
  setTaskPrimaryAssignee,
  updateTaskDateRange
} from '../services/tasks.service.js';
import { createAppShellRenderer } from '../features/app-shell/render.js';
import { createProjectRenderer } from '../features/projects/render.js';
import { createTaskCardRenderer } from '../features/tasks/card-renderer.js';
import { createTasksBoardRenderer } from '../features/tasks/board-renderer.js';
import { createTeamRenderer } from '../features/team/render.js';
import { createAuditRenderer } from '../features/audit/render.js';
import { createAccessRenderer } from '../features/access/render.js';
import { createWorkspaceModals } from '../features/modals/workspace-modals.js';
import { createTimelineCalendarRenderer } from '../features/timeline/calendar-renderer.js';
import { createChatFeature } from '../features/chat/index.js';
import { createRuntimeActions } from '../features/actions/runtime-actions.js';
import { createRuntimeBindings } from '../features/app-shell/bindings.js';
import { createTaskCommentsFeature } from '../features/tasks/comments.js';
import { createTaskRecurrenceFeature } from '../features/tasks/recurrence.js';
import { createTaskFavoritesFeature } from '../features/tasks/favorites.js';
import { createSessionController } from './session-controller.js';
import { createRuntimeDataLoader } from './data-loader.js';
import { createRealtimeBridge } from './realtime-bridge.js';
import {
  canManageWorkspace,
  canViewAudit,
  canManageUsers as canManageUsersPermission,
  canEditUser as canEditUserPermission,
  canDeactivateUser as canDeactivateUserPermission,
  canDeleteComment as canDeleteCommentPermission,
  getWorkspacePermissionSnapshot
} from '../core/permissions/index.js';

/*
 * Workspace runtime core.
 *
 * This file contains the stabilized historical application core: auth, data loading,
 * main screen orchestration, compatibility wrappers and remaining legacy glue.
 * Stage 1 decomposition moved standalone feature enhancers out of this file. Do not add
 * new feature code here; add modules under assets/features and load them from bootstrap.js.
 */
/* Workspace runtime v90: slower-network task loader + slim task query. */
(()=>{if(window.__WS_V90__)return;window.__WS_V90__=1;
const $=id=>document.getElementById(id),qa=s=>[...document.querySelectorAll(s)],esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])),pad=n=>String(n).padStart(2,'0'),ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()),today=()=>ymd(new Date()),D=v=>new Date(String(v||today()).slice(0,10)+'T00:00:00'),add=(v,n)=>{let d=D(v);d.setDate(d.getDate()+n);return ymd(d)},diff=(a,b)=>Math.round((D(b)-D(a))/864e5),fmt=v=>v?D(v).toLocaleDateString('ru-RU'):'—',dt=v=>v?new Date(v).toLocaleString('ru-RU'):'—';
const ST={idea:'Идея',planned:'Запланировано',in_progress:'В работе',waiting:'Ожидание',done:'Завершено',blocked:'Заблокировано'},PR={high:'Высокий',medium:'Средний',low:'Низкий'},COLS=['planned','in_progress','waiting','done'];
const TL0=6,TL1=22,TLS=30,TLD=60,TLP=1.1;
function mt(n){n=Math.max(0,Math.min(1439,Math.round(n)));return pad(Math.floor(n/60))+':'+pad(n%60)}
const initialRuntimeState={sb:null,user:null,profile:null,view:'overview',projects:[],tasks:[],users:[],members:[],assignees:[],subtasks:[],taskComments:[],messages:[],logs:[],notifications:[],permissions:null,warnings:[],taskError:'',loading:false,tasksLoading:false,dragTask:null,activeChat:null};
appStore.replaceState(initialRuntimeState,{source:'runtime-init'});
exposeAppStore(appStore);
const S=appStore.legacyState;
Object.defineProperties(window,{projects:{configurable:true,get(){return S.projects}},tasks:{configurable:true,get(){return S.tasks}},users:{configurable:true,get(){return S.users}},currentAuth:{configurable:true,get(){return S.user}},currentProfile:{configurable:true,get(){return S.profile}},sb:{configurable:true,get(){return S.sb}},taskAssigneesV4:{configurable:true,get(){return S.assignees}},taskSubtasksV1:{configurable:true,get(){return S.subtasks}},projectMessagesV4:{configurable:true,get(){return S.messages}}});
let timelineFeature, chatFeature, runtimeActions, runtimeBindings;
let taskCommentsFeature, taskRecurrenceFeature, taskFavoritesFeature;
let sessionController, dataLoader, realtimeBridge;
function renderTimeline(){return timelineFeature.renderTimeline()}
function ensureTaskCalendarUi(){return timelineFeature.ensureTaskCalendarUi()}
function readTaskCalendarFields(){return timelineFeature.readTaskCalendarFields()}
function fillTaskCalendarFields(t){return timelineFeature.fillTaskCalendarFields(t)}
function syncTaskCalendarUi(){return timelineFeature.syncTaskCalendarUi()}
function renderChat(){return chatFeature.renderChat()}
function sendChat(){return chatFeature.sendChat()}
function deleteMessage(id){return chatFeature.deleteMessage(id)}
function clearChat(){return chatFeature.clearChat()}
function saveProject(e){return runtimeActions.saveProject(e)}
function saveTask(e){return runtimeActions.saveTask(e)}
function saveUser(e){return runtimeActions.saveUser(e)}
function saveAccess(e){return runtimeActions.saveAccess(e)}
function del(table,id){return runtimeActions.del(table,id)}
function toggleTask(id,done){return runtimeActions.toggleTask(id,done)}
function moveTask(id,st){return runtimeActions.moveTask(id,st)}
function updateTaskTimeline(id,start_date,due_date){return runtimeActions.updateTaskTimeline(id,start_date,due_date)}
function toggleTaskFavorite(id){return runtimeActions.toggleTaskFavorite(id)}
function addSubtask(task_id,title){return runtimeActions.addSubtask(task_id,title)}
function toggleSubtask(id,done){return runtimeActions.toggleSubtask(id,done)}
function deleteSubtask(id){return runtimeActions.deleteSubtask(id)}
function bind(){return runtimeBindings.bind()}
function taskCommentList(taskId){return taskCommentsFeature.taskCommentList(taskId)}
function renderTaskCommentsModal(){return taskCommentsFeature.renderTaskCommentsModal()}
function taskRecurrenceEnabled(){return taskRecurrenceFeature.taskRecurrenceEnabled()}
function setupTaskRecurrenceFields(task,id){return taskRecurrenceFeature.setupTaskRecurrenceFields(task,id)}
function createRecurringTasks(baseRow,selected){return taskRecurrenceFeature.createRecurringTasks(baseRow,selected)}
function restore(){return sessionController.restore()}
function signIn(){return sessionController.signIn()}
function claim(){return sessionController.claim()}
function logout(){return sessionController.logout()}
function loadTasksSafe(options={}){return dataLoader.loadTasksSafe(options)}
function load(){return dataLoader.load()}
function setupRealtime(){return realtimeBridge.setupRealtime()}
function teardownRealtime(){return realtimeBridge.teardownRealtime()}
function rtUpsert(table,row){return realtimeBridge.rtUpsert(table,row)}
window.__WorkspaceApp={store:appStore,getState:()=>appStore.getState(),subscribe:(...args)=>appStore.subscribe(...args),select:(...args)=>appStore.select(...args),get state(){return S},get client(){return S.sb},get permissions(){return permissions()},get view(){return S.view},get timelineDate(){return S.timelineDate},set timelineDate(v){S.timelineDate=v},add,today,status,load,render,renderProjects,renderTasks,renderTeam,renderChat,setView,openProject,openTask,openUser,openAccess,toggleTask,moveTask,updateTaskTimeline,fillTaskCalendarFields,syncTaskCalendarUi,mt,get TL0(){return TL0},get TLP(){return TLP},get TLS(){return TLS},get TLD(){return TLD}};
function css(){document.body?.classList.add('runtime-css-ready')}
function cfg(){let c={};try{c=JSON.parse(localStorage.getItem('pt_workspace_supabase_cfg_v2')||'{}')}catch{}if(!c.url&&window.__WORKSPACE_SUPABASE_URL__)c={url:window.__WORKSPACE_SUPABASE_URL__,key:window.__WORKSPACE_SUPABASE_KEY__};if(c.url&&c.key)try{localStorage.setItem('pt_workspace_supabase_cfg_v2',JSON.stringify({...c,source:c.source||'bundled'}))}catch{}return c.url&&c.key?{url:String(c.url).replace(/\/+$/,''),key:String(c.key)}:null}
function sb(){if(S.sb)return S.sb;let c=cfg();if(!c)throw Error('Нет конфигурации Supabase');S.sb=supabase.createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return S.sb}
function status(a,b=''){if($('sideStatusTitle'))$('sideStatusTitle').textContent=a;if($('sideStatusText'))$('sideStatusText').textContent=b;if($('settingsStatus'))$('settingsStatus').textContent=a+(b?' · '+b:'')}
sessionController = createSessionController({ S, $, sb, status, render, load });
function dedupeTaskAssignees(){let seen=new Set(),out=[];(S.assignees||[]).forEach(a=>{if(!a||!a.task_id||!a.user_id)return;let k=a.task_id+'::'+a.user_id;if(seen.has(k))return;seen.add(k);out.push(a)});S.assignees=out;return out}
function byId(a,id){return a.find(x=>x.id===id)}function uname(id){let u=byId(S.users,id);return u?.display_name||u?.email||'—'}function pname(id){return byId(S.projects,id)?.name||'—'}function pcolor(id){return byId(S.projects,id)?.color||'#64748b'}function rgba(h,a){h=String(h||'#64748b').replace('#','');if(h.length===3)h=h.split('').map(x=>x+x).join('');let n=parseInt(h,16)||0;return`rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`}
function tids(t){dedupeTaskAssignees();let seen=new Set(),r=[];S.assignees.filter(a=>a.task_id===t.id).map(a=>a.user_id).filter(Boolean).forEach(id=>{if(!seen.has(id)){seen.add(id);r.push(id)}});if(t.assignee_id&&!seen.has(t.assignee_id)){seen.add(t.assignee_id);r.push(t.assignee_id)}return r}function subs(id){return S.subtasks.filter(s=>s.task_id===id&&!s.deleted_at).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)||String(a.created_at||'').localeCompare(String(b.created_at||'')))}
function permissions(){return getWorkspacePermissionSnapshot(S.profile,S.projects,S.members)}function admin(){return canManageWorkspace(S.profile)}function owner(){return canViewAudit(S.profile)}function canManageUsers(){return canManageUsersPermission(S.profile)}function canEditWorkspaceUser(u){return canEditUserPermission(S.profile,u)}function canDeactivateWorkspaceUser(u){return canDeactivateUserPermission(S.profile,u)}
/* Clean render optimization v116 start */
function renderMetricsOnly(){if($('mProjects'))$('mProjects').textContent=S.projects.length;if($('mOpen'))$('mOpen').textContent=S.tasks.filter(t=>t.status!=='done').length;if($('mOverdue'))$('mOverdue').textContent=S.tasks.filter(t=>t.status!=='done'&&t.due_date&&t.due_date<today()).length;if($('mUsers'))$('mUsers').textContent=S.users.length}
function selectSignature(){return JSON.stringify({p:S.projects.map(p=>[p.id,p.name,p.owner_id,p.status]),u:S.users.map(u=>[u.id,u.display_name,u.email])})}
function selectsMaybe(){let sig=selectSignature();if(S.selectSignature===sig)return;S.selectSignature=sig;selects()}
function scheduleRender(reason){S.renderReason=reason||S.renderReason||'update';clearTimeout(S.renderTimer);S.renderTimer=setTimeout(()=>{S.renderTimer=null;try{renderMetricsOnly();if(S.view==='tasks')renderTasks();else if(S.view==='projects')renderProjects();else if(S.view==='timeline')renderTimeline();else if(S.view==='team')renderTeam();else if(S.view==='chat')renderChat();else if(S.view==='audit')renderAudit();else render()}catch(e){console.warn('[render]',e)}},60)}
realtimeBridge = createRealtimeBridge({ S, $, dedupeTaskAssignees, loadTasksSafe, scheduleRender, renderTaskCommentsModal });
dataLoader = createRuntimeDataLoader({ S, status, restore, render, owner, permissions, dedupeTaskAssignees, setupRealtime });
/* Clean render optimization v116 end */
function vals(id){let e=$(id);if(!e)return['all'];let v=[...e.selectedOptions].map(o=>o.value).filter(Boolean);if(!v.length)v=[e.value||'all'];return v.includes('all')?['all']:v}function opts(id,html){let e=$(id);if(!e)return;let keep=e.multiple?[...e.selectedOptions].map(o=>o.value):[e.value];e.innerHTML=html;[...e.options].forEach(o=>{o.selected=keep.includes(o.value)});if(!e.multiple&&[...e.options].some(o=>o.value===keep[0]))e.value=keep[0]}
function selects(){let us='<option value="">Не назначен</option>'+S.users.map(u=>`<option value="${u.id}">${esc(u.display_name||u.email)}</option>`).join(''),ps=S.projects.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');opts('projectOwner',us);opts('taskAssignee',S.users.map(u=>`<option value="${u.id}">${esc(u.display_name||u.email)}</option>`).join(''));opts('taskProject',ps);opts('projectOwnerFilter','<option value="all">Все владельцы</option>'+S.users.map(u=>`<option value="${u.id}">${esc(u.display_name||u.email)}</option>`).join(''));opts('taskProjectFilter','<option value="all">Все проекты</option>'+ps);opts('taskAssigneeFilter','<option value="all">Все исполнители</option>'+S.users.map(u=>`<option value="${u.id}">${esc(u.display_name||u.email)}</option>`).join(''));opts('accessUser',S.users.map(u=>`<option value="${u.id}">${esc(u.display_name||u.email)}</option>`).join(''));opts('chatProject',S.projects.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join(''))}
const projectRenderer = createProjectRenderer({ S, $, esc, fmt, rgba, uname, vals, ST, PR });
function cardP(project){return projectRenderer.cardProject(project)}
const taskCardRenderer = createTaskCardRenderer({ S, esc, fmt, dt, rgba, pcolor, pname, uname, tids, subs, today, PR, taskCommentList });
function subBlock(task){return taskCardRenderer.subtaskBlock(task)}
function doneWho(task){return taskCardRenderer.doneMeta(task)}
function isTaskFavorite(task){return taskCardRenderer.isFavorite(task)}
taskCommentsFeature = createTaskCommentsFeature({ S, $, esc, dt, byId, canDeleteComment: (comment) => canDeleteCommentPermission(S.profile, comment), rtUpsert, scheduleRender });
taskCommentsFeature.bind();
function cardT(task){return taskCardRenderer.cardTask(task)}
const appShellRenderer = createAppShellRenderer({ S, $, qa, today, cardP, cardT, selectsMaybe, admin, owner, renderProjects, renderTasks, renderTeam, renderAudit, renderTimeline, renderChat, renderAccess });
function render(){return appShellRenderer.render()}
function renderProjects(){return projectRenderer.renderProjects()}
const tasksBoardRenderer = createTasksBoardRenderer({ S, $, qa, vals, esc, ST, COLS, tids, isTaskFavorite, cardT, today, D, ymd, pad, add, diff, byId, saveTaskOrder, setTaskPrimaryAssignee, updateTaskDateRange, pname, uname });
function renderTasks(){return tasksBoardRenderer.renderTasks()}
const teamRenderer = createTeamRenderer({ S, $, esc, canManageUsers, canEditWorkspaceUser, canDeactivateWorkspaceUser });
function renderTeam(){return teamRenderer.renderTeam()}
function logPayload(r){let p=r.payload;if(typeof p==='string'){try{p=JSON.parse(p)}catch{p={raw:p}}}return p||{}}function shortJson(o){let s=JSON.stringify(o,null,2);return s&&s!=='{}'?esc(s.length>1400?s.slice(0,1400)+'…':s):''}function logContext(r){let p=logPayload(r),actor=p.actor?.display_name||p.actor?.email||p.actor_name||p.user_name||p.email||'',target=p.task_title||p.project_name||p.message_body||p.title||p.name||p.entity_title||r.entity_id||'',changes=p.changes||p.diff||p.patch||p.after||p.new||null;let parts=[];if(actor)parts.push('Кто: '+actor);if(r.entity_type)parts.push('Сущность: '+r.entity_type);if(target)parts.push('Контекст: '+target);if(changes&&typeof changes==='object')parts.push('Изменения: '+Object.entries(changes).slice(0,8).map(([k,v])=>`${k}: ${typeof v==='object'?JSON.stringify(v):v}`).join('; '));return parts.join(' · ')}
const auditRenderer = createAuditRenderer({ S, $, esc, dt, logPayload, shortJson, logContext });
function renderAudit(){return auditRenderer.renderAudit()}
timelineFeature = createTimelineCalendarRenderer({ S, $, qa, esc, fmt, pcolor, rgba, tids, uname, pname, ST, PR, pad, D, today, ymd, add, selectsMaybe });
chatFeature = createChatFeature({ S, $, opts, esc, dt, uname, byId });
const accessRenderer = createAccessRenderer({ S, $, esc, uname });
function renderAccess(){return accessRenderer.renderAccess()}
function setView(v){S.view=v;qa('.view').forEach(x=>x.classList.toggle('active',x.id===v));qa('.nav button[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===v));$('pageTitle')&&($('pageTitle').textContent={overview:'Обзор',projects:'Проекты',tasks:'Задачи',timeline:'Таймлайн',chat:'Чаты',team:'Команда',audit:'Журнал',settings:'Настройки'}[v]||'Обзор');render()}
const workspaceModals = createWorkspaceModals({ S, $, qa, byId, pname, tids, renderAccess, fillTaskCalendarFields, setupTaskRecurrenceFields, renderTaskCommentsModal });
function openProject(id){return workspaceModals.openProject(id)}
function openTask(id,pid){return workspaceModals.openTask(id,pid)}
function openUser(id){return workspaceModals.openUser(id)}
function openAccess(pid){return workspaceModals.openAccess(pid)}
taskRecurrenceFeature = createTaskRecurrenceFeature({ S, $, qa, D, ymd, add, diff });
taskRecurrenceFeature.bind();

runtimeActions = createRuntimeActions({ S, $, qa, byId, subs, load, render, renderTasks, renderTimeline, renderAccess, ensureTaskCalendarUi, readTaskCalendarFields, taskRecurrenceEnabled, createRecurringTasks });
taskFavoritesFeature = createTaskFavoritesFeature({ toggleTaskFavorite });
taskFavoritesFeature.bind();
runtimeBindings = createRuntimeBindings({ S, $, qa, add, setView, load, signIn, claim, logout, openProject, openTask, openUser, openAccess, saveProject, saveTask, saveUser, saveAccess, sendChat, renderChat, renderTimeline, renderProjects, renderTasks, del, toggleTask, moveTask, updateTaskTimeline, addSubtask, toggleSubtask, deleteSubtask, deleteMessage, removeProjectMember, status });
async function init(){css();let c=cfg();$('supabaseUrl')&&($('supabaseUrl').value=c?.url||'');$('supabaseKey')&&($('supabaseKey').value=c?.key||'');bind();status('База подключена','Проверяю текущую сессию...');try{await restore();if(S.user&&S.profile)await load();else status('База подключена','Войдите по email и паролю.')}catch(e){status('Ошибка инициализации',e.message)}render()}document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
