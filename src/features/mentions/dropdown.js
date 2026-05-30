import {
  currentProfile as getCurrentProfile,
  projectList as getProjectList,
  userList as getUserList,
  workspaceClient
} from '../../core/workspace-context.js';
import {
  fetchAllUsers,
  fetchCurrentAppUserId,
  fetchProjectMembersThin,
  fetchProjects
} from '../../services/workspace.service.js';
import { allowedMentionUsers as getAllowedMentionUsers } from '../../core/permissions/index.js';

/* Feature module migrated from assets/modules/mention-dropdown.js. Keep dependencies on runtime globals explicit. */
/* mention dropdown v6 */
(function(){
if(window.__MENTION_DROPDOWN_V6__)return;window.__MENTION_DROPDOWN_V6__=1;
var S={u:[],m:[],p:[],me:null,ta:null,t:0,timer:null};
function el(i){return document.getElementById(i)}
function api(){return workspaceClient()}
function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function g(a){try{if(a==='users')return getUserList();if(a==='projects')return getProjectList();return Array.isArray(window[a])?window[a]:[]}catch(e){return[]}}
function uniq(a){var m={},r=[];a.forEach(function(x){if(x&&x.id&&!m[x.id]){m[x.id]=1;r.push(x)}});return r}
function domUsers(){var r=[];['taskAssignee','accessUser','projectOwner','taskAssigneeFilter','projectOwnerFilter'].forEach(function(id){var s=el(id);if(!s)return;Array.prototype.slice.call(s.options||[]).forEach(function(o){var v=String(o.value||'').trim(),t=String(o.textContent||'').trim();if(v&&v!=='all'&&t&&!/^все\s/i.test(t)&&!/^не назнач/i.test(t))r.push({id:v,display_name:t,email:'',role:'member',is_active:true})})});return r}
function users(){return uniq(g('users').concat(S.u).concat(domUsers()))}
function projects(){return uniq(g('projects').concat(S.p))}
function nm(u){return u&&(u.display_name||u.email)||'Пользователь'}
function initials(u){return nm(u).slice(0,2).toUpperCase()}
async function load(force){var c=api();if(!c)return;if(!force&&Date.now()-S.t<30000&&S.me)return;try{S.u=await fetchAllUsers(c)}catch(e){}try{S.p=(await fetchProjects(c)).map(function(p){return{id:p.id,name:p.name,owner_id:p.owner_id,deleted_at:p.deleted_at}})}catch(e){}try{S.m=await fetchProjectMembersThin(c)}catch(e){}try{var pr=getCurrentProfile();if(pr&&pr.id)S.me=users().find(function(u){return u.id===pr.id})||pr;else{var id=await fetchCurrentAppUserId(c);if(id)S.me=users().find(function(u){return u.id===id})||null}}catch(e){}S.t=Date.now();try{window.users=users()}catch(e){}}
function pids(uid){var s=new Set();projects().forEach(function(p){if(p&&p.owner_id===uid&&!p.deleted_at)s.add(p.id)});S.m.forEach(function(x){if(x&&x.user_id===uid)s.add(x.project_id)});return s}
function allowed(){return getAllowedMentionUsers(S.me,users(),projects(),S.m)}
function css(){if(el('mention-dropdown-v6-css'))return;var s=document.createElement('style');s.id='mention-dropdown-v6-css';s.textContent='.mention-hint{display:none!important}.mention-fix-menu{position:fixed;z-index:2147483647;width:min(340px,calc(100vw - 24px));max-height:260px;overflow:auto;border:1px solid #dbe4ef;border-radius:14px;background:#fff;box-shadow:0 20px 54px rgba(15,23,42,.22);padding:6px;display:none}.mention-fix-menu.open{display:block}.mention-fix-option{display:flex;align-items:center;gap:8px;width:100%;border:0;background:transparent;color:#0f172a;text-align:left;border-radius:10px;padding:8px 9px;cursor:pointer}.mention-fix-option:hover{background:#eff6ff}.mention-fix-avatar{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:#e2e8f0;color:#334155;font-size:11px;font-weight:900}.mention-fix-main b{display:block;font-size:13px}.mention-fix-main span{display:block;font-size:12px;color:#64748b}.mention-fix-empty{padding:9px 10px;color:#64748b;font-size:13px}';document.head.appendChild(s)}
function rm(){document.querySelectorAll('.mention-hint').forEach(function(x){x.remove()})}
function textarea(x){if(x&&x.id==='taskCommentText')return x;if(x&&x.matches&&x.matches('textarea')&&x.closest('.task-comment-form,.task-comments-block,#taskModal,dialog'))return x;return el('taskCommentText')||document.querySelector('#taskModal textarea,dialog textarea,.task-comments-block textarea,.task-comment-form textarea')}
function menu(t){css();rm();var m=el('mentionFixMenu');if(!m){m=document.createElement('div');m.id='mentionFixMenu';m.className='mention-fix-menu'}var host=t.closest('dialog')||el('taskModal')||document.body;if(m.parentNode!==host)host.appendChild(m);return m}
function q(t,p){var b=String(t||'').slice(0,p),i=b.lastIndexOf('@');if(i<0)return null;var s=b.slice(i+1);if(s.length>60||s.indexOf('\n')>=0||s.indexOf('\r')>=0)return null;if(/[,;.!?()\[\]{}]/.test(s))return null;return{start:i,text:s.trim().toLowerCase()}}
function draw(t,a){var m=menu(t),r=t.getBoundingClientRect();m.style.left=Math.max(10,Math.min(r.left,window.innerWidth-360))+'px';m.style.top=Math.min(r.bottom+6,window.innerHeight-280)+'px';m.innerHTML=a.length?a.slice(0,12).map(function(u){return'<button type="button" class="mention-fix-option" data-mention-fix-user="'+esc(u.id)+'"><span class="mention-fix-avatar">'+esc(initials(u))+'</span><span class="mention-fix-main"><b>'+esc(nm(u))+'</b><span>'+esc(u.email||'')+'</span></span></button>'}).join(''):'<div class="mention-fix-empty">Нет доступных пользователей</div>';m.classList.add('open')}
function hide(){var m=el('mentionFixMenu');if(m)m.classList.remove('open')}
async function update(force){var t=S.ta||textarea(document.activeElement);if(!t||document.activeElement!==t){hide();return}var x=q(t.value,t.selectionStart);if(!x){hide();return}await load(force);var a=allowed().filter(function(u){return !x.text||((u.display_name||'')+' '+(u.email||'')).toLowerCase().indexOf(x.text)>=0});draw(t,a)}
function ins(id){var t=S.ta||textarea(document.activeElement),u=users().find(function(x){return x.id===id});if(!t||!u)return;var x=q(t.value,t.selectionStart);if(!x)return;var add='@'+nm(u)+' ';t.value=t.value.slice(0,x.start)+add+t.value.slice(t.selectionStart);var p=x.start+add.length;t.focus();t.setSelectionRange(p,p);t.dispatchEvent(new Event('input',{bubbles:true}));hide()}
function sch(f,target){var t=textarea(target||document.activeElement);if(t)S.ta=t;clearTimeout(S.timer);S.timer=setTimeout(function(){update(f)},30)}
document.addEventListener('input',function(e){var t=textarea(e.target);if(t&&e.target===t)sch(false,t)},true);
document.addEventListener('keyup',function(e){var t=textarea(e.target);if(t&&e.target===t)sch(false,t)},true);
document.addEventListener('focusin',function(e){var t=textarea(e.target);if(t&&e.target===t)sch(true,t)},true);
document.addEventListener('click',function(e){var b=e.target.closest('[data-mention-fix-user]');if(b){e.preventDefault();e.stopPropagation();ins(b.getAttribute('data-mention-fix-user'));return}var t=textarea(e.target);if(t&&e.target===t){sch(true,t);return}if(!e.target.closest('#mentionFixMenu'))hide()},true);
document.addEventListener('keydown',function(e){var m=el('mentionFixMenu');if(!m||!m.classList.contains('open'))return;if(e.key==='Escape')hide();if(e.key==='Enter'||e.key==='Tab'){var b=m.querySelector('[data-mention-fix-user]');if(b){e.preventDefault();ins(b.getAttribute('data-mention-fix-user'))}}},true);
css();rm();load(true);setInterval(rm,500);
})();
