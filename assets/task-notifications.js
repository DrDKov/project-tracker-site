/* Task assignment and mention notifications v2. Lightweight module loaded after app-runtime. */
(function(){
  if(window.__TASK_NOTIFICATIONS_V2__) return;
  window.__TASK_NOTIFICATIONS_V2__ = true;

  var READ_KEY = 'pt_task_notifications_read_v2';
  var PANEL_KEY = 'pt_task_notifications_panel_v2';
  var state = { comments: [], notifications: [], fetching: false, lastFetch: 0 };

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }
  function reEsc(value){
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  }
  function norm(value){
    return String(value || '').trim().toLowerCase();
  }
  function profile(){ return window.currentProfile || null; }
  function client(){ return window.sb || null; }
  function tasks(){ return Array.isArray(window.tasks) ? window.tasks : []; }
  function users(){ return Array.isArray(window.users) ? window.users : []; }
  function assignees(){ return Array.isArray(window.taskAssigneesV4) ? window.taskAssigneesV4 : []; }
  function currentUserId(){ var p = profile(); return p && p.id ? String(p.id) : ''; }
  function readMap(){
    try { return JSON.parse(localStorage.getItem(READ_KEY) || '{}') || {}; } catch(e) { return {}; }
  }
  function saveReadMap(map){
    try { localStorage.setItem(READ_KEY, JSON.stringify(map || {})); } catch(e) {}
  }
  function userById(id){
    id = String(id || '');
    return users().find(function(u){ return String(u.id || '') === id; }) || null;
  }
  function userLabel(u){
    return String((u && (u.display_name || u.email)) || '').trim();
  }
  function userShortToken(u){
    var label = userLabel(u);
    if(!label) return '';
    if(label.indexOf('@') >= 0) label = label.split('@')[0];
    var first = label.split(/\s+/).filter(Boolean)[0] || label;
    return '@' + first.replace(/^@+/, '');
  }
  function taskById(id){
    id = String(id || '');
    return tasks().find(function(t){ return String(t.id || '') === id; }) || null;
  }
  function taskAssignedToMe(task){
    var uid = currentUserId();
    if(!uid || !task) return false;
    if(String(task.assignee_id || '') === uid) return true;
    return assignees().some(function(a){
      return String(a.task_id || '') === String(task.id || '') && String(a.user_id || '') === uid;
    });
  }
  function mentionKeysForProfile(){
    var p = profile();
    if(!p) return [];
    var raw = [];
    var name = String(p.display_name || '').trim();
    var email = String(p.email || '').trim();
    if(name){
      raw.push(name);
      raw = raw.concat(name.split(/\s+/).filter(Boolean));
    }
    if(email){
      raw.push(email);
      raw.push(email.split('@')[0]);
    }
    var seen = {};
    return raw.map(function(x){ return String(x || '').trim().replace(/^@+/, ''); }).filter(function(x){
      var k = x.toLowerCase();
      if(x.length < 2 || seen[k]) return false;
      seen[k] = true;
      return true;
    });
  }
  function textMentionsCurrentUser(body){
    var text = String(body || '');
    return mentionKeysForProfile().some(function(key){
      var pattern = '(^|\\s)@' + reEsc(key).replace(/\\ /g,'[ _.-]+') + '(?=\\s|$|[,.!?:;])';
      return new RegExp(pattern,'iu').test(text);
    });
  }
  function notificationTime(value){
    if(!value) return '';
    try { return new Date(value).toLocaleString('ru-RU'); } catch(e) { return ''; }
  }
  function buildNotifications(){
    var uid = currentUserId();
    if(!uid) return [];
    var out = [];

    tasks().forEach(function(task){
      if(!task || task.deleted_at || task.status === 'done') return;
      if(!taskAssignedToMe(task)) return;
      out.push({
        id: 'assign:' + task.id,
        type: 'assigned',
        task_id: task.id,
        created_at: task.updated_at || task.created_at || '',
        title: 'Вам назначена задача',
        body: task.title || 'Задача'
      });
    });

    state.comments.forEach(function(comment){
      if(!comment || comment.deleted_at) return;
      if(String(comment.user_id || '') === uid) return;
      if(!textMentionsCurrentUser(comment.body)) return;
      var task = taskById(comment.task_id);
      out.push({
        id: 'mention:' + comment.id,
        type: 'mention',
        task_id: comment.task_id,
        created_at: comment.created_at || '',
        title: 'Вас упомянули в комментарии',
        body: task ? task.title : String(comment.body || '').slice(0,140)
      });
    });

    out.sort(function(a,b){ return String(b.created_at || '').localeCompare(String(a.created_at || '')); });
    return out;
  }
  function ensureCss(){
    if(document.getElementById('task-notifications-v2-css')) return;
    var style = document.createElement('style');
    style.id = 'task-notifications-v2-css';
    style.textContent = '.task-notify-wrap{position:relative;display:inline-flex;z-index:210}.task-notify-bell{position:relative}.task-notify-bell.has-unread{background:#0f172a!important;color:#fff!important}.task-notify-count{position:absolute;right:-5px;top:-6px;min-width:18px;height:18px;border-radius:999px;background:#dc2626;color:#fff;font-size:11px;font-weight:900;display:grid;place-items:center;padding:0 4px}.task-notify-count.hidden{display:none}.task-notify-panel{position:absolute;right:0;top:calc(100% + 8px);width:min(390px,calc(100vw - 24px));max-height:470px;overflow:auto;border:1px solid #dbe4ef;border-radius:18px;background:#fff;box-shadow:0 24px 80px rgba(15,23,42,.22);padding:10px;display:none}.task-notify-wrap.open .task-notify-panel{display:block}.task-notify-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 4px 10px;border-bottom:1px solid #eef2f7;margin-bottom:6px}.task-notify-head b{font-size:14px}.task-notify-head button{border:0;border-radius:9px;background:#f1f5f9;color:#334155;font-size:12px;font-weight:900;padding:7px 9px;cursor:pointer}.task-notify-item{width:100%;border:0;border-radius:13px;background:#fff;text-align:left;padding:10px;cursor:pointer;display:block}.task-notify-item:hover{background:#f8fafc}.task-notify-item.unread{background:#eff6ff}.task-notify-title{font-weight:900;color:#0f172a;font-size:13px}.task-notify-body{font-size:12px;color:#475569;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.task-notify-time{font-size:11px;color:#94a3b8;margin-top:4px}.task-notify-empty{padding:18px;color:#64748b;text-align:center}.task-mention-chips{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px}.task-mention-chip{border:0;border-radius:999px;background:#eef2ff;color:#3730a3;font-size:12px;font-weight:900;padding:6px 9px;cursor:pointer}.task-mention-chip:hover{background:#dbeafe}.mention-hit{background:#e0f2fe;color:#075985;border-radius:6px;padding:0 3px;font-weight:900}';
    document.head.appendChild(style);
  }
  function ensureBell(){
    ensureCss();
    var top = document.querySelector('.top-actions');
    if(!top) return null;
    var wrap = document.getElementById('taskNotifyWrap');
    if(wrap) return wrap;
    wrap = document.createElement('div');
    wrap.id = 'taskNotifyWrap';
    wrap.className = 'task-notify-wrap';
    wrap.innerHTML = '<button type="button" class="btn secondary task-notify-bell" id="taskNotifyBell" title="Уведомления">🔔<span class="task-notify-count hidden" id="taskNotifyCount">0</span></button><div class="task-notify-panel" id="taskNotifyPanel"><div class="task-notify-head"><b>Уведомления</b><button type="button" id="taskNotifyReadAll">Прочитать все</button></div><div id="taskNotifyList"></div></div>';
    top.insertBefore(wrap, top.firstChild);
    document.getElementById('taskNotifyBell').addEventListener('click',function(event){
      event.preventDefault();
      event.stopPropagation();
      wrap.classList.toggle('open');
      try { localStorage.setItem(PANEL_KEY, wrap.classList.contains('open') ? '1' : '0'); } catch(e) {}
      refreshComments(true);
      renderBell();
    });
    document.getElementById('taskNotifyReadAll').addEventListener('click',function(event){
      event.preventDefault();
      event.stopPropagation();
      var map = readMap();
      state.notifications.forEach(function(n){ map[n.id] = true; });
      saveReadMap(map);
      renderBell();
    });
    return wrap;
  }
  function renderBell(){
    var wrap = ensureBell();
    if(!wrap) return;
    state.notifications = buildNotifications();
    var map = readMap();
    var unread = state.notifications.filter(function(n){ return !map[n.id]; }).length;
    var count = document.getElementById('taskNotifyCount');
    var bell = document.getElementById('taskNotifyBell');
    var list = document.getElementById('taskNotifyList');
    if(count){
      count.textContent = String(unread);
      count.classList.toggle('hidden', unread < 1);
    }
    if(bell) bell.classList.toggle('has-unread', unread > 0);
    if(!list) return;
    if(!state.notifications.length){
      list.innerHTML = '<div class="task-notify-empty">Нет уведомлений</div>';
      return;
    }
    list.innerHTML = state.notifications.slice(0,40).map(function(n){
      var unreadClass = map[n.id] ? '' : 'unread';
      return '<button type="button" class="task-notify-item '+unreadClass+'" data-notify-id="'+esc(n.id)+'" data-task-id="'+esc(n.task_id)+'"><div class="task-notify-title">'+esc(n.title)+'</div><div class="task-notify-body">'+esc(n.body)+'</div><div class="task-notify-time">'+esc(notificationTime(n.created_at))+'</div></button>';
    }).join('');
  }
  function markRead(id){
    if(!id) return;
    var map = readMap();
    map[id] = true;
    saveReadMap(map);
  }
  function openTaskFromNotification(taskId){
    var wrap = document.getElementById('taskNotifyWrap');
    if(wrap) wrap.classList.remove('open');
    var nav = document.querySelector('.nav button[data-view="tasks"]');
    if(nav) nav.click();
    setTimeout(function(){
      var button = document.createElement('button');
      button.type = 'button';
      button.dataset.action = 'open-task';
      button.dataset.id = taskId;
      button.style.display = 'none';
      document.body.appendChild(button);
      button.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
      setTimeout(function(){
        button.remove();
        enhanceCommentComposer();
        highlightMentions();
        var modal = document.getElementById('taskModal');
        if(modal) modal.classList.add('task-notify-focus');
      },120);
    },80);
  }
  async function refreshComments(force){
    var sb = client();
    var p = profile();
    if(!sb || !p || !p.id || state.fetching) return;
    var now = Date.now();
    if(!force && now - state.lastFetch < 15000) return;
    state.fetching = true;
    state.lastFetch = now;
    try {
      var r = await sb.from('task_comments').select('id,task_id,user_id,body,created_at,deleted_at').is('deleted_at',null).order('created_at',{ascending:false}).limit(500);
      if(!r.error) state.comments = r.data || [];
    } catch(e) {
      console.warn('[task notifications] comments refresh failed', e);
    } finally {
      state.fetching = false;
      renderBell();
      enhanceCommentComposer();
      highlightMentions();
    }
  }
  function enhanceCommentComposer(){
    var form = document.querySelector('#taskCommentsBlock .task-comment-form');
    var textarea = document.getElementById('taskCommentText');
    if(!form || !textarea) return;
    var chips = document.getElementById('taskMentionChips');
    if(!chips){
      chips = document.createElement('div');
      chips.id = 'taskMentionChips';
      chips.className = 'task-mention-chips';
      form.insertBefore(chips, textarea);
    }
    chips.innerHTML = users().map(function(user){
      var token = userShortToken(user);
      return token ? '<button type="button" class="task-mention-chip" data-mention="'+esc(token)+'">'+esc(token)+'</button>' : '';
    }).join('');
  }
  function insertMention(token){
    var textarea = document.getElementById('taskCommentText');
    if(!textarea || !token) return;
    var start = textarea.selectionStart || textarea.value.length;
    var end = textarea.selectionEnd || textarea.value.length;
    var before = textarea.value.slice(0,start);
    var after = textarea.value.slice(end);
    var prefix = before && !/\s$/.test(before) ? ' ' : '';
    textarea.value = before + prefix + token + ' ' + after;
    textarea.focus();
    var pos = (before + prefix + token + ' ').length;
    try { textarea.setSelectionRange(pos,pos); } catch(e) {}
  }
  function highlightMentions(){
    Array.prototype.slice.call(document.querySelectorAll('.task-comment-body')).forEach(function(body){
      if(body.dataset.mentionEnhanced === '1') return;
      var text = body.textContent || '';
      body.innerHTML = esc(text).replace(/(^|\s)(@[\p{L}\p{N}_.-]+)/gu,function(_,space,token){
        return space + '<span class="mention-hit">' + esc(token) + '</span>';
      });
      body.dataset.mentionEnhanced = '1';
    });
  }
  function scheduleRender(){
    renderBell();
    enhanceCommentComposer();
    highlightMentions();
    refreshComments(false);
  }

  document.addEventListener('click',function(event){
    var item = event.target.closest('.task-notify-item');
    if(item){
      event.preventDefault();
      event.stopPropagation();
      markRead(item.dataset.notifyId);
      renderBell();
      openTaskFromNotification(item.dataset.taskId);
      return;
    }
    var chip = event.target.closest('.task-mention-chip');
    if(chip){
      event.preventDefault();
      event.stopPropagation();
      insertMention(chip.dataset.mention);
      return;
    }
    if(!event.target.closest('#taskNotifyWrap')){
      var wrap = document.getElementById('taskNotifyWrap');
      if(wrap) wrap.classList.remove('open');
    }
    if(event.target.closest('[data-action="open-task"]')){
      setTimeout(function(){ enhanceCommentComposer(); highlightMentions(); refreshComments(false); },200);
    }
    if(event.target.closest('[data-action="add-task-comment"]')){
      setTimeout(function(){ refreshComments(true); },700);
    }
  },true);

  var observer = new MutationObserver(function(){ scheduleRender(); });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState === 'visible') refreshComments(true);
  });
  window.addEventListener('online',function(){ refreshComments(true); });

  [0,600,1500,3000,6000].forEach(function(delay){
    setTimeout(function(){ ensureBell(); refreshComments(delay === 0); scheduleRender(); }, delay);
  });
  setInterval(function(){ refreshComments(false); renderBell(); }, 20000);
})();
