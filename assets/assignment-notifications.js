/* Workspace assignment notifications v1: realtime visual alerts when current user is assigned to a task. */
(function(){
  if(window.__ASSIGNMENT_NOTIFICATIONS_V1__) return;
  window.__ASSIGNMENT_NOTIFICATIONS_V1__ = 1;

  var STORE_PREFIX = 'pt_assignment_notifications_v1:';
  var MAX_ITEMS = 30;
  var state = { sb:null, profile:null, profileId:'', channel:null, items:[], unread:0, recent:{} };

  function $(id){ return document.getElementById(id); }
  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }
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

  function ensureCss(){
    if($('assignment-notifications-css')) return;
    var style = document.createElement('style');
    style.id = 'assignment-notifications-css';
    style.textContent = '.assignment-bell{position:relative;min-width:42px;padding-left:11px!important;padding-right:11px!important}.assignment-bell.pulse{animation:assignmentPulse .9s ease-out 2}.assignment-badge{position:absolute;right:-5px;top:-6px;min-width:18px;height:18px;padding:0 5px;border-radius:99px;background:#ef4444;color:#fff;font-size:11px;line-height:18px;font-weight:900;text-align:center;box-shadow:0 0 0 2px #fff}.assignment-badge.hidden{display:none}.assignment-panel{position:fixed;right:20px;top:72px;width:min(390px,calc(100vw - 28px));max-height:70vh;overflow:hidden;z-index:6000;border:1px solid #dbe4ef;border-radius:18px;background:#fff;box-shadow:0 22px 70px rgba(15,23,42,.22);display:none}.assignment-panel.open{display:block}.assignment-panel-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 14px;border-bottom:1px solid #eef2f7}.assignment-panel-head b{font-size:15px}.assignment-panel-head button{border:0;border-radius:10px;background:#f1f5f9;color:#334155;font-weight:900;padding:8px 10px;cursor:pointer}.assignment-list{max-height:calc(70vh - 54px);overflow:auto;padding:8px}.assignment-item{display:block;width:100%;border:1px solid #eef2f7;border-radius:14px;background:#fff;text-align:left;padding:10px 11px;margin:6px 0;color:#0f172a;cursor:pointer}.assignment-item:hover{background:#f8fafc}.assignment-item.unread{border-color:#bfdbfe;background:#eff6ff}.assignment-item-title{font-weight:900;margin-bottom:4px}.assignment-item-meta{font-size:12px;color:#64748b}.assignment-empty{padding:18px;color:#64748b;text-align:center}.assignment-toasts{position:fixed;right:18px;bottom:18px;z-index:7000;display:grid;gap:10px;width:min(380px,calc(100vw - 28px))}.assignment-toast{border:1px solid #bfdbfe;border-left:5px solid #2563eb;border-radius:16px;background:#fff;box-shadow:0 18px 54px rgba(15,23,42,.22);padding:12px 13px;text-align:left;cursor:pointer;color:#0f172a}.assignment-toast b{display:block;margin-bottom:4px}.assignment-toast div{font-size:13px}.assignment-toast small{display:block;margin-top:5px;color:#64748b}@keyframes assignmentPulse{0%{box-shadow:0 0 0 0 rgba(37,99,235,.35)}100%{box-shadow:0 0 0 12px rgba(37,99,235,0)}}@media(max-width:720px){.assignment-panel{right:10px;top:64px}.assignment-toasts{right:10px;bottom:76px}}';
    document.head.appendChild(style);
  }

  function loadStore(){
    try{
      var raw = JSON.parse(localStorage.getItem(storeKey()) || '{}');
      state.items = Array.isArray(raw.items) ? raw.items.slice(0,MAX_ITEMS) : [];
      state.unread = state.items.filter(function(x){ return x && x.unread; }).length;
    }catch(e){ state.items = []; state.unread = 0; }
  }
  function saveStore(){
    try{ localStorage.setItem(storeKey(),JSON.stringify({items:state.items.slice(0,MAX_ITEMS)})); }catch(e){}
  }

  function ensureUi(){
    ensureCss();
    var top = document.querySelector('.top-actions');
    if(top && !$('assignmentBell')){
      var bell = document.createElement('button');
      bell.id = 'assignmentBell';
      bell.type = 'button';
      bell.className = 'btn secondary assignment-bell';
      bell.title = 'Оповещения о назначениях';
      bell.innerHTML = '<span aria-hidden="true">🔔</span><span class="assignment-badge hidden" id="assignmentBadge">0</span>';
      top.insertBefore(bell,top.firstChild);
      bell.addEventListener('click',function(event){ event.preventDefault(); togglePanel(); });
    }
    if(!$('assignmentPanel')){
      var panel = document.createElement('div');
      panel.id = 'assignmentPanel';
      panel.className = 'assignment-panel';
      panel.innerHTML = '<div class="assignment-panel-head"><b>Оповещения</b><button type="button" data-assignment-clear>Прочитано</button></div><div class="assignment-list" id="assignmentList"></div>';
      document.body.appendChild(panel);
    }
    if(!$('assignmentToasts')){
      var toasts = document.createElement('div');
      toasts.id = 'assignmentToasts';
      toasts.className = 'assignment-toasts';
      document.body.appendChild(toasts);
    }
    renderUi();
  }

  function renderUi(){
    var badge = $('assignmentBadge');
    if(badge){
      badge.textContent = state.unread > 99 ? '99+' : String(state.unread || 0);
      badge.classList.toggle('hidden',!state.unread);
    }
    var list = $('assignmentList');
    if(list){
      if(!state.items.length){ list.innerHTML = '<div class="assignment-empty">Новых назначений пока нет</div>'; }
      else{
        list.innerHTML = state.items.map(function(item){
          return '<button type="button" class="assignment-item '+(item.unread?'unread':'')+'" data-assignment-open="'+esc(item.task_id)+'"><div class="assignment-item-title">'+esc(item.title || 'Задача')+'</div><div class="assignment-item-meta">'+esc(item.project || 'Проект не указан')+' · '+esc(dt(item.created_at))+'</div></button>';
        }).join('');
      }
    }
  }

  function togglePanel(){
    ensureUi();
    var panel = $('assignmentPanel');
    if(!panel) return;
    panel.classList.toggle('open');
    if(panel.classList.contains('open')) markAllRead(false);
  }
  function closePanel(){ var p=$('assignmentPanel'); if(p) p.classList.remove('open'); }
  function markAllRead(rerender){
    state.items.forEach(function(x){ if(x) x.unread = false; });
    state.unread = 0;
    saveStore();
    if(rerender !== false) renderUi(); else renderUi();
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

  function pushItem(task){
    var item = { id:'assignment-'+Date.now()+'-'+Math.random().toString(36).slice(2), task_id:task.id, title:task.title || 'Задача', project:projectName(task.project_id), created_at:new Date().toISOString(), unread:true };
    state.items = state.items.filter(function(x){ return x && x.task_id !== item.task_id; });
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
    var toast = document.createElement('button');
    toast.type = 'button';
    toast.className = 'assignment-toast';
    toast.setAttribute('data-assignment-open',item.task_id);
    toast.innerHTML = '<b>Вам назначили задачу</b><div>'+esc(item.title)+'</div><small>'+esc(item.project)+'</small>';
    box.prepend(toast);
    setTimeout(function(){ toast.style.opacity = '0'; toast.style.transform = 'translateY(8px)'; },7000);
    setTimeout(function(){ if(toast.parentNode) toast.parentNode.removeChild(toast); },7600);
  }

  async function handleAssignment(taskId){
    if(!taskId || !state.profileId) return;
    var key = 'task:' + taskId;
    if(isRecent(key,8000)) return;
    var task = await getTask(taskId);
    if(!task || task.deleted_at) return;
    pushItem(task);
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
    var channelName = 'workspace-assignment-alerts-v1-' + state.profileId.slice(0,8) + '-' + Date.now().toString(36);
    var ch = state.sb.channel(channelName);
    ch.on('postgres_changes',{event:'INSERT',schema:'public',table:'task_assignees'},function(payload){
      var row = payload.new || {};
      if(row.user_id === state.profileId) handleAssignment(row.task_id);
    });
    ch.on('postgres_changes',{event:'UPDATE',schema:'public',table:'tasks'},function(payload){
      var row = payload.new || {}, old = payload.old || {};
      if(row.assignee_id === state.profileId && Object.prototype.hasOwnProperty.call(old,'assignee_id') && old.assignee_id !== row.assignee_id) handleAssignment(row.id);
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
    loadStore();
    ensureUi();
    subscribe();
  }

  document.addEventListener('click',function(event){
    var open = event.target.closest('[data-assignment-open]');
    if(open){
      event.preventDefault();
      event.stopPropagation();
      openTask(open.getAttribute('data-assignment-open'));
      return;
    }
    if(event.target.closest('[data-assignment-clear]')){
      event.preventDefault();
      markAllRead(true);
    }
    var panel = $('assignmentPanel'), bell = $('assignmentBell');
    if(panel && panel.classList.contains('open') && !event.target.closest('#assignmentPanel') && !event.target.closest('#assignmentBell')) closePanel();
  },true);

  function boot(){
    ensureUi();
    rebindProfile();
    setInterval(rebindProfile,1200);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
