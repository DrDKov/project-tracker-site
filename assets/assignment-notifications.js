/* Workspace notifications v2: realtime visual alerts for task assignments and task comment mentions. */
(function(){
  if(window.__ASSIGNMENT_NOTIFICATIONS_V3__) return;
  window.__ASSIGNMENT_NOTIFICATIONS_V3__ = 1;
  window.__ASSIGNMENT_NOTIFICATIONS_V2__ = 1;

  var STORE_PREFIX = 'pt_assignment_notifications_v1:';
  var MAX_ITEMS = 40;
  var MEMBERS_TTL = 45000;
  var state = { sb:null, profile:null, profileId:'', channel:null, items:[], unread:0, readBefore:'1970-01-01T00:00:00.000Z', readSyncBusy:false, recent:{}, members:[], membersLoadedAt:0, mentionMenu:null, bypassCommentSubmit:false };

  function $(id){ return document.getElementById(id); }
  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }
  function escapeRegExp(value){ return String(value || '').replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
  function dt(value){
    try{ return value ? new Date(value).toLocaleString('ru-RU') : new Date().toLocaleString('ru-RU'); }
    catch(e){ return ''; }
  }
  function client(){ try{ return window.sb || null; }catch(e){ return null; } }
  function profile(){ try{ return window.currentProfile || null; }catch(e){ return null; } }
  function tasks(){ try{ return Array.isArray(window.tasks) ? window.tasks : []; }catch(e){ return []; } }
  function projects(){ try{ return Array.isArray(window.projects) ? window.projects : []; }catch(e){ return []; } }
  function users(){ try{ return Array.isArray(window.users) ? window.users : []; }catch(e){ return []; } }
  function storeKey(){ return STORE_PREFIX + (state.profileId || 'anonymous'); }
  function cssId(value){
    if(window.CSS && CSS.escape) return CSS.escape(String(value));
    return String(value).replace(/[^a-zA-Z0-9_-]/g,'\\$&');
  }
  function userName(userId){
    var u = users().find(function(x){ return x && x.id === userId; });
    return u ? (u.display_name || u.email || 'Пользователь') : 'Пользователь';
  }

  function ensureCss(){
    if($('assignment-notifications-css')) return;
    var style = document.createElement('style');
    style.id = 'assignment-notifications-css';
    style.textContent = '.assignment-bell{position:relative;min-width:42px;padding-left:11px!important;padding-right:11px!important}.assignment-bell.pulse{animation:assignmentPulse .9s ease-out 2}.assignment-badge{position:absolute;right:-5px;top:-6px;min-width:18px;height:18px;padding:0 5px;border-radius:99px;background:#ef4444;color:#fff;font-size:11px;line-height:18px;font-weight:900;text-align:center;box-shadow:0 0 0 2px #fff}.assignment-badge.hidden{display:none}.assignment-panel{position:fixed;right:20px;top:72px;width:min(410px,calc(100vw - 28px));max-height:70vh;overflow:hidden;z-index:6000;border:1px solid #dbe4ef;border-radius:18px;background:#fff;box-shadow:0 22px 70px rgba(15,23,42,.22);display:none}.assignment-panel.open{display:block}.assignment-panel-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 14px;border-bottom:1px solid #eef2f7}.assignment-panel-head b{font-size:15px}.assignment-panel-head button{border:0;border-radius:10px;background:#f1f5f9;color:#334155;font-weight:900;padding:8px 10px;cursor:pointer}.assignment-panel-head button[disabled]{opacity:.5;cursor:default}.assignment-list{max-height:calc(70vh - 54px);overflow:auto;padding:8px}.assignment-item{display:block;width:100%;border:1px solid #eef2f7;border-radius:14px;background:#fff;text-align:left;padding:10px 11px;margin:6px 0;color:#0f172a;cursor:pointer}.assignment-item:hover{background:#f8fafc}.assignment-item.unread{border-color:#bfdbfe;background:#eff6ff}.assignment-item-title{font-weight:900;margin-bottom:4px}.assignment-item-meta{font-size:12px;color:#64748b}.assignment-type{display:inline-flex;align-items:center;border-radius:999px;background:#eef2ff;color:#3730a3;font-size:11px;font-weight:900;padding:2px 7px;margin-right:6px}.assignment-empty{padding:18px;color:#64748b;text-align:center}.assignment-toasts{position:fixed;right:18px;bottom:18px;z-index:7000;display:grid;gap:10px;width:min(390px,calc(100vw - 28px))}.assignment-toast{border:1px solid #bfdbfe;border-left:5px solid #2563eb;border-radius:16px;background:#fff;box-shadow:0 18px 54px rgba(15,23,42,.22);padding:12px 13px;text-align:left;cursor:pointer;color:#0f172a;transition:opacity .25s ease,transform .25s ease}.assignment-toast b{display:block;margin-bottom:4px}.assignment-toast div{font-size:13px}.assignment-toast small{display:block;margin-top:5px;color:#64748b}.mention-menu{position:fixed;z-index:8000;width:min(340px,calc(100vw - 24px));max-height:260px;overflow:auto;border:1px solid #dbe4ef;border-radius:14px;background:#fff;box-shadow:0 20px 54px rgba(15,23,42,.22);padding:6px;display:none}.mention-menu.open{display:block}.mention-option{display:flex;align-items:center;gap:8px;width:100%;border:0;background:transparent;color:#0f172a;text-align:left;border-radius:10px;padding:8px 9px;cursor:pointer}.mention-option:hover,.mention-option.active{background:#eff6ff}.mention-avatar{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:#e2e8f0;color:#334155;font-size:11px;font-weight:900;flex:0 0 auto}.mention-main{min-width:0}.mention-main b{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mention-main span{display:block;font-size:12px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mention-hint{font-size:12px;color:#64748b;margin-top:6px}.task-comment-body .mention-token{display:inline-flex;border-radius:8px;background:#eef2ff;color:#3730a3;font-weight:800;padding:0 4px}@keyframes assignmentPulse{0%{box-shadow:0 0 0 0 rgba(37,99,235,.35)}100%{box-shadow:0 0 0 12px rgba(37,99,235,0)}}@media(max-width:720px){.assignment-panel{right:10px;top:64px}.assignment-toasts{right:10px;bottom:76px}}';
    document.head.appendChild(style);
  }

  function readTime(value){ var t=Date.parse(value || ''); return Number.isFinite(t) ? t : 0; }
  function normalizeItems(items){
    var seen = {};
    return (Array.isArray(items) ? items : []).filter(function(item){
      if(!item || !item.task_id) return false;
      var key = item.type === 'mention' ? (item.id || 'mention:'+item.task_id) : 'assignment-task:'+item.task_id;
      if(seen[key]) return false;
      seen[key] = true;
      return true;
    }).sort(function(a,b){
      var byCreatedAt = readTime(b.created_at) - readTime(a.created_at);
      if(byCreatedAt) return byCreatedAt;
      return String(b.id || '').localeCompare(String(a.id || ''));
    }).slice(0,MAX_ITEMS);
  }
  function applyReadBefore(){
    var cutoff = readTime(state.readBefore);
    state.items.forEach(function(item){
      if(item && readTime(item.created_at) <= cutoff) item.unread = false;
    });
    state.unread = state.items.filter(function(item){ return item && item.unread; }).length;
  }
  function loadStore(){
    try{
      var raw = JSON.parse(localStorage.getItem(storeKey()) || '{}');
      state.items = normalizeItems(raw.items);
      state.readBefore = raw.read_before || '1970-01-01T00:00:00.000Z';
      applyReadBefore();
    }catch(e){ state.items = []; state.unread = 0; state.readBefore = '1970-01-01T00:00:00.000Z'; }
  }
  function saveStore(){
    try{ localStorage.setItem(storeKey(),JSON.stringify({items:normalizeItems(state.items),read_before:state.readBefore})); }catch(e){}
  }
  async function loadRemoteReadState(){
    if(!state.sb || !state.profileId || state.readSyncBusy) return;
    state.readSyncBusy = true;
    try{
      var result = await state.sb.from('notification_read_state').select('read_before').eq('user_id',state.profileId).maybeSingle();
      if(!result.error && result.data && readTime(result.data.read_before) > readTime(state.readBefore)){
        state.readBefore = result.data.read_before;
        applyReadBefore();
        saveStore();
        renderUi();
      }
    }catch(e){ console.warn('Notification read state load failed',e); }
    finally{ state.readSyncBusy = false; }
  }
  async function saveRemoteReadState(){
    if(!state.sb || !state.profileId) return;
    try{
      var result = await state.sb.from('notification_read_state').upsert({
        user_id:state.profileId,
        read_before:state.readBefore,
        updated_at:new Date().toISOString()
      },{onConflict:'user_id'});
      if(result.error) throw result.error;
    }catch(e){ console.warn('Notification read state save failed',e); }
  }

  function ensureUi(){
    ensureCss();
    var top = document.querySelector('.top-actions');
    if(top && !$('assignmentBell')){
      var bell = document.createElement('button');
      bell.id = 'assignmentBell';
      bell.type = 'button';
      bell.className = 'btn secondary assignment-bell';
      bell.title = 'Оповещения о назначениях и упоминаниях';
      bell.innerHTML = '<span aria-hidden="true">🔔</span><span class="assignment-badge hidden" id="assignmentBadge">0</span>';
      top.insertBefore(bell,top.firstChild);
      bell.addEventListener('click',function(event){ event.preventDefault(); togglePanel(); });
    }
    if(!$('assignmentPanel')){
      var panel = document.createElement('div');
      panel.id = 'assignmentPanel';
      panel.className = 'assignment-panel';
      panel.innerHTML = '<div class="assignment-panel-head"><b>Оповещения</b><button type="button" data-assignment-clear>Отметить все прочитанными</button></div><div class="assignment-list" id="assignmentList"></div>';
      document.body.appendChild(panel);
    }
    if(!$('assignmentToasts')){
      var toasts = document.createElement('div');
      toasts.id = 'assignmentToasts';
      toasts.className = 'assignment-toasts';
      document.body.appendChild(toasts);
    }
    if(!$('mentionMenu')){
      var menu = document.createElement('div');
      menu.id = 'mentionMenu';
      menu.className = 'mention-menu';
      document.body.appendChild(menu);
      state.mentionMenu = menu;
    }else state.mentionMenu = $('mentionMenu');
    renderUi();
  }

  function renderUi(){
    state.items = normalizeItems(state.items);
    applyReadBefore();
    var badge = $('assignmentBadge');
    if(badge){
      badge.textContent = state.unread > 99 ? '99+' : String(state.unread || 0);
      badge.classList.toggle('hidden',!state.unread);
    }
    var clear = document.querySelector('[data-assignment-clear]');
    if(clear){
      clear.textContent = 'Отметить все прочитанными';
      clear.disabled = !state.unread;
      clear.title = state.unread ? 'Убрать все текущие уведомления из счётчика новых' : 'Непрочитанных уведомлений нет';
    }
    var list = $('assignmentList');
    if(list){
      if(!state.items.length){ list.innerHTML = '<div class="assignment-empty">Новых уведомлений пока нет</div>'; }
      else{
        list.innerHTML = state.items.map(function(item){
          var type = item.type === 'mention' ? 'Упоминание' : 'Назначение';
          var title = item.type === 'mention' ? 'Вас упомянули в комментарии' : 'Вам назначили задачу';
          return '<button type="button" class="assignment-item '+(item.unread?'unread':'')+'" data-assignment-open="'+esc(item.task_id)+'"><div class="assignment-item-title"><span class="assignment-type">'+type+'</span>'+esc(title)+'</div><div>'+esc(item.title || 'Задача')+'</div><div class="assignment-item-meta">'+esc(item.project || 'Проект не указан')+' · '+esc(item.author ? 'от '+item.author+' · ' : '')+esc(dt(item.created_at))+'</div></button>';
        }).join('');
      }
    }
  }

  function togglePanel(){
    ensureUi();
    var panel = $('assignmentPanel');
    if(!panel) return;
    panel.classList.toggle('open');
  }
  function closePanel(){ var p=$('assignmentPanel'); if(p) p.classList.remove('open'); }
  function markAllRead(){
    state.readBefore = new Date().toISOString();
    state.items.forEach(function(x){ if(x) x.unread = false; });
    state.unread = 0;
    saveStore();
    renderUi();
    saveRemoteReadState();
  }
  function markTaskRead(taskId){
    state.items.forEach(function(x){ if(x && x.task_id === taskId) x.unread = false; });
    state.unread = state.items.filter(function(x){ return x && x.unread; }).length;
    saveStore();
    renderUi();
  }

  function projectName(projectId){
    var p = projects().find(function(x){ return x && x.id === projectId; });
    return p ? (p.name || 'Проект') : 'Проект не указан';
  }
  function isRecent(key,ms){
    var t = Date.now(), old = state.recent[key] || 0;
    state.recent[key] = t;
    Object.keys(state.recent).forEach(function(k){ if(t - state.recent[k] > 60000) delete state.recent[k]; });
    return old && (t - old < (ms || 8000));
  }
  async function getTask(taskId){
    var local = tasks().find(function(t){ return t && t.id === taskId; });
    if(local) return local;
    if(!state.sb) return {id:taskId,title:'Задача',project_id:null};
    try{
      var r = await state.sb.from('tasks').select('id,project_id,title,status,priority,start_date,due_date,created_at,updated_at,deleted_at,assignee_id').eq('id',taskId).maybeSingle();
      if(!r.error && r.data){
        var arr = tasks();
        if(arr && !arr.some(function(t){ return t && t.id === r.data.id; })) arr.push(r.data);
        return r.data;
      }
    }catch(e){}
    return {id:taskId,title:'Задача',project_id:null};
  }

  function pushItem(type,task,extra){
    extra = extra || {};
    var key = type === 'mention' ? ('mention:'+(extra.comment_id || Date.now())+':'+task.id) : ('assignment:'+(extra.notification_id || task.id));
    var item = { id:key, type:type || 'assignment', task_id:task.id, title:task.title || 'Задача', project:projectName(task.project_id), author:extra.author || '', comment_id:extra.comment_id || '', created_at:extra.created_at || new Date().toISOString(), unread:true };
    if(readTime(item.created_at) <= readTime(state.readBefore)) item.unread = false;
    state.items = state.items.filter(function(x){ return x && x.id !== item.id && !(item.type === 'assignment' && x.type !== 'mention' && x.task_id === item.task_id); });
    state.items.unshift(item);
    state.items = state.items.slice(0,MAX_ITEMS);
    state.unread = state.items.filter(function(x){ return x && x.unread; }).length;
    saveStore();
    ensureUi();
    pulseBell();
    showToast(item);
  }
  function pulseBell(){
    var bell = $('assignmentBell');
    if(!bell) return;
    bell.classList.remove('pulse');
    void bell.offsetWidth;
    bell.classList.add('pulse');
  }
  function showToast(item){
    var box = $('assignmentToasts');
    if(!box) return;
    var title = item.type === 'mention' ? 'Вас упомянули в комментарии' : 'Вам назначили задачу';
    var toast = document.createElement('button');
    toast.type = 'button';
    toast.className = 'assignment-toast';
    toast.setAttribute('data-assignment-open',item.task_id);
    toast.innerHTML = '<b>'+esc(title)+'</b><div>'+esc(item.title)+'</div><small>'+esc(item.project)+(item.author ? ' · '+esc(item.author) : '')+'</small>';
    box.prepend(toast);
    setTimeout(function(){ toast.style.opacity = '0'; toast.style.transform = 'translateY(8px)'; },7000);
    setTimeout(function(){ if(toast.parentNode) toast.parentNode.removeChild(toast); },7600);
  }

  async function handleAssignment(taskId,assignment){
    if(!taskId || !state.profileId) return;
    var notificationId = assignment && assignment.id ? assignment.id : taskId;
    var key = 'assignment:' + notificationId;
    if(isRecent(key,8000)) return;
    var task = await getTask(taskId);
    if(!task || task.deleted_at) return;
    pushItem('assignment',task,{notification_id:notificationId,created_at:assignment && assignment.created_at});
  }

  function mentionLabels(user){
    var out = [];
    if(user && user.display_name) out.push(String(user.display_name).trim());
    if(user && user.email) out.push(String(user.email).trim());
    return out.filter(Boolean).filter(function(value,index,arr){ return arr.indexOf(value) === index; });
  }
  function bodyMentionsUser(body,user){
    body = String(body || '');
    return mentionLabels(user).some(function(label){
      var rx = new RegExp('(^|[\\s\\(\\[\\{,;:])@'+escapeRegExp(label)+'(?=$|[\\s\\)\\]\\},.!?;:])','iu');
      return rx.test(body);
    });
  }
  function mentionedUsersInBody(body){
    var seen = {};
    return users().filter(function(user){
      if(!user || !user.id || seen[user.id]) return false;
      var ok = bodyMentionsUser(body,user);
      if(ok) seen[user.id] = true;
      return ok;
    });
  }
  async function refreshMembers(force){
    if(!state.sb) return [];
    if(!force && Date.now() - state.membersLoadedAt < MEMBERS_TTL) return state.members;
    try{
      var r = await state.sb.from('project_members').select('*').order('created_at',{ascending:true});
      if(!r.error && Array.isArray(r.data)){
        state.members = r.data;
        state.membersLoadedAt = Date.now();
      }
    }catch(e){}
    return state.members;
  }
  function isOwnerProfile(userId){
    var u = users().find(function(x){ return x && x.id === userId; });
    return !!(u && u.role === 'owner');
  }
  function projectIdsForUser(userId){
    var ids = new Set();
    projects().forEach(function(p){ if(p && p.owner_id === userId) ids.add(p.id); });
    state.members.forEach(function(m){ if(m && m.user_id === userId) ids.add(m.project_id); });
    return ids;
  }
  function canUserMentionTarget(authorId,targetId){
    if(!authorId || !targetId || authorId === targetId) return false;
    if(isOwnerProfile(authorId)) return true;
    var a = projectIdsForUser(authorId), t = projectIdsForUser(targetId), shared = false;
    a.forEach(function(id){ if(t.has(id)) shared = true; });
    return shared;
  }
  function allowedMentionUsers(){
    var me = state.profile;
    if(!me || !me.id) return [];
    var list = users().filter(function(u){ return u && u.id && u.id !== me.id && u.is_active !== false; });
    if(me.role === 'owner') return list;
    var pids = projectIdsForUser(me.id);
    if(!pids.size) projects().forEach(function(p){ if(p && p.id) pids.add(p.id); });
    var allowed = new Set();
    projects().forEach(function(p){ if(p && pids.has(p.id) && p.owner_id) allowed.add(p.owner_id); });
    state.members.forEach(function(m){ if(m && pids.has(m.project_id) && m.user_id) allowed.add(m.user_id); });
    return list.filter(function(u){ return allowed.has(u.id); });
  }
  function mentionDisplayName(user){ return (user && (user.display_name || user.email)) || 'Пользователь'; }
  function initials(user){ return mentionDisplayName(user).slice(0,2).toUpperCase(); }

  async function handleCommentMention(row){
    if(!row || !row.task_id || !state.profileId || row.user_id === state.profileId) return;
    var commentKey = 'mention:' + (row.id || row.task_id + ':' + row.created_at) + ':' + state.profileId;
    if(isRecent(commentKey,8000)) return;
    var me = users().find(function(u){ return u && u.id === state.profileId; }) || state.profile;
    if(!me || !bodyMentionsUser(row.body || row.content || '',me)) return;
    await refreshMembers(false);
    if(!canUserMentionTarget(row.user_id,state.profileId)) return;
    var task = await getTask(row.task_id);
    if(!task || task.deleted_at) return;
    pushItem('mention',task,{comment_id:row.id || '',author:userName(row.user_id)});
  }

  function ensureMentionHint(){
    var ta = $('taskCommentText');
    if(!ta || ta.__mentionHintReady) return;
    ta.__mentionHintReady = true;
    var hint = document.createElement('div');
    hint.className = 'mention-hint';
    hint.textContent = 'Введите @, чтобы отметить пользователя.';
    if(ta.parentNode) ta.parentNode.insertBefore(hint,ta.nextSibling);
  }
  function mentionQuery(text,pos){
    var before = String(text || '').slice(0,pos == null ? 0 : pos), at = before.lastIndexOf('@');
    if(at < 0) return null;
    var chunk = before.slice(at + 1);
    if(chunk.length > 50 || /[\n\r]/.test(chunk) || /[,;.!?()\[\]{}]/.test(chunk)) return null;
    return {start:at,end:before.length,query:chunk.trim().toLowerCase()};
  }
  function hideMentionMenu(){ if(state.mentionMenu) state.mentionMenu.classList.remove('open'); }
  function positionMentionMenu(ta){
    if(!state.mentionMenu || !ta) return;
    var r = ta.getBoundingClientRect();
    state.mentionMenu.style.left = Math.max(10,Math.min(r.left,window.innerWidth - 360)) + 'px';
    state.mentionMenu.style.top = Math.min(r.bottom + 6,window.innerHeight - 280) + 'px';
  }
  function renderMentionMenu(ta,candidates,query){
    ensureUi();
    var menu = state.mentionMenu;
    if(!menu || !ta || !candidates.length){ hideMentionMenu(); return; }
    menu.innerHTML = candidates.slice(0,8).map(function(u){
      return '<button type="button" class="mention-option" data-mention-user="'+esc(u.id)+'"><span class="mention-avatar">'+esc(initials(u))+'</span><span class="mention-main"><b>'+esc(mentionDisplayName(u))+'</b><span>'+esc(u.email || '')+'</span></span></button>';
    }).join('');
    menu.dataset.textareaId = ta.id;
    menu.dataset.query = query || '';
    positionMentionMenu(ta);
    menu.classList.add('open');
  }
  function updateMentionMenu(){
    var ta = $('taskCommentText');
    if(!ta || document.activeElement !== ta){ hideMentionMenu(); return; }
    var q = mentionQuery(ta.value,ta.selectionStart);
    if(!q){ hideMentionMenu(); return; }
    var list = allowedMentionUsers().filter(function(u){
      var hay = [u.display_name || '',u.email || ''].join(' ').toLowerCase();
      return !q.query || hay.indexOf(q.query) !== -1;
    });
    renderMentionMenu(ta,list,q.query);
  }
  function insertMention(userId){
    var ta = $('taskCommentText'), user = users().find(function(u){ return u && u.id === userId; });
    if(!ta || !user) return;
    var q = mentionQuery(ta.value,ta.selectionStart);
    if(!q) return;
    var label = '@' + mentionDisplayName(user) + ' ';
    ta.value = ta.value.slice(0,q.start) + label + ta.value.slice(ta.selectionStart);
    var pos = q.start + label.length;
    ta.focus();
    ta.setSelectionRange(pos,pos);
    hideMentionMenu();
  }

  function decorateRenderedComments(){
    var all = document.querySelectorAll('.task-comment-body:not([data-mentions-decorated])');
    if(!all.length) return;
    all.forEach(function(node){
      var text = node.textContent || '';
      var html = esc(text);
      users().forEach(function(u){
        mentionLabels(u).forEach(function(label){
          if(!label) return;
          var rx = new RegExp('(^|[\\s\\(\\[\\{,;:])@'+escapeRegExp(esc(label))+'(?=$|[\\s\\)\\]\\},.!?;:])','giu');
          html = html.replace(rx,function(match,prefix){ return prefix + '<span class="mention-token">@'+esc(label)+'</span>'; });
        });
      });
      node.innerHTML = html;
      node.setAttribute('data-mentions-decorated','1');
    });
  }

  async function validateAndForwardCommentSubmit(button,event){
    if(state.bypassCommentSubmit){ state.bypassCommentSubmit = false; return; }
    var ta = $('taskCommentText');
    if(!ta) return;
    var body = ta.value || '';
    if(body.indexOf('@') < 0) return;
    event.preventDefault();
    event.stopPropagation();
    if(event.stopImmediatePropagation) event.stopImmediatePropagation();
    await refreshMembers(true);
    var mentioned = mentionedUsersInBody(body), allowed = new Set(allowedMentionUsers().map(function(u){ return u.id; }));
    var blocked = mentioned.filter(function(u){ return !allowed.has(u.id); });
    if(blocked.length){
      alert('Вы не можете отметить: ' + blocked.map(mentionDisplayName).join(', ') + '. Можно отмечать только пользователей, с которыми у вас есть общий проект.');
      return;
    }
    state.bypassCommentSubmit = true;
    button.click();
  }

  function openTask(taskId){
    if(!taskId) return;
    markTaskRead(taskId);
    closePanel();
    var nav = document.querySelector('.nav button[data-view="tasks"]');
    if(nav) nav.click();
    getTask(taskId).then(function(){
      setTimeout(function(){
        var card = document.querySelector('.task-card[data-task-id="'+cssId(taskId)+'"]');
        if(card && card.scrollIntoView) card.scrollIntoView({block:'center',behavior:'smooth'});
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.style.display = 'none';
        btn.setAttribute('data-action','open-task');
        btn.setAttribute('data-id',taskId);
        document.body.appendChild(btn);
        btn.click();
        setTimeout(function(){ if(btn.parentNode) btn.parentNode.removeChild(btn); },50);
      },160);
    });
  }

  function subscribe(){
    if(!state.sb || !state.profileId || state.channel) return;
    var channelName = 'workspace-notifications-v2-' + state.profileId.slice(0,8) + '-' + Date.now().toString(36);
    var ch = state.sb.channel(channelName);
    ch.on('postgres_changes',{event:'INSERT',schema:'public',table:'task_assignees'},function(payload){
      var row = payload.new || {};
      if(row.user_id === state.profileId) handleAssignment(row.task_id,row);
    });
    ch.on('postgres_changes',{event:'UPDATE',schema:'public',table:'tasks'},function(payload){
      var row = payload.new || {}, old = payload.old || {};
      if(row.assignee_id === state.profileId && Object.prototype.hasOwnProperty.call(old,'assignee_id') && old.assignee_id !== row.assignee_id) handleAssignment(row.id,{id:'direct:'+row.id,created_at:row.updated_at || new Date().toISOString()});
    });
    ch.on('postgres_changes',{event:'INSERT',schema:'public',table:'task_comments'},function(payload){
      handleCommentMention(payload.new || {});
    });
    state.channel = ch;
    ch.subscribe(function(status){
      if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].indexOf(status) !== -1){
        try{ if(state.sb && state.channel) state.sb.removeChannel(state.channel); }catch(e){}
        state.channel = null;
        setTimeout(subscribe,2500);
      }
    });
  }
  function rebindProfile(){
    var sb = client(), p = profile();
    if(!sb || !p || !p.id) return;
    if(state.profileId === p.id && state.sb === sb) return;
    try{ if(state.channel && state.sb) state.sb.removeChannel(state.channel); }catch(e){}
    state.sb = sb;
    state.profile = p;
    state.profileId = p.id;
    state.channel = null;
    state.membersLoadedAt = 0;
    loadStore();
    ensureUi();
    loadRemoteReadState();
    refreshMembers(true).then(function(){ updateMentionMenu(); decorateRenderedComments(); });
    subscribe();
  }

  window.addEventListener('pt-notification-store-changed',function(){
    if(!state.profileId) return;
    loadStore();
    ensureUi();
  });

  document.addEventListener('click',function(event){
    var mention = event.target.closest('[data-mention-user]');
    if(mention){
      event.preventDefault();
      event.stopPropagation();
      insertMention(mention.getAttribute('data-mention-user'));
      return;
    }
    var open = event.target.closest('[data-assignment-open]');
    if(open){
      event.preventDefault();
      event.stopPropagation();
      openTask(open.getAttribute('data-assignment-open'));
      return;
    }
    if(event.target.closest('[data-assignment-clear]')){
      event.preventDefault();
      markAllRead();
    }
    var add = event.target.closest('[data-action="add-task-comment"]');
    if(add){ validateAndForwardCommentSubmit(add,event); return; }
    var panel = $('assignmentPanel');
    if(panel && panel.classList.contains('open') && !event.target.closest('#assignmentPanel') && !event.target.closest('#assignmentBell')) closePanel();
    if(!event.target.closest('#mentionMenu') && !event.target.closest('#taskCommentText')) hideMentionMenu();
  },true);
  document.addEventListener('input',function(event){
    if(event.target && event.target.id === 'taskCommentText'){
      refreshMembers(false).then(updateMentionMenu);
    }
  },true);
  document.addEventListener('keydown',function(event){
    if(!state.mentionMenu || !state.mentionMenu.classList.contains('open')) return;
    if(event.key === 'Escape'){ hideMentionMenu(); return; }
    if(event.key === 'Enter' || event.key === 'Tab'){
      var first = state.mentionMenu.querySelector('[data-mention-user]');
      if(first){ event.preventDefault(); insertMention(first.getAttribute('data-mention-user')); }
    }
  },true);

  function boot(){
    ensureUi();
    rebindProfile();
    setInterval(rebindProfile,1200);
    setInterval(loadRemoteReadState,15000);
    setInterval(function(){ ensureMentionHint(); decorateRenderedComments(); },700);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
