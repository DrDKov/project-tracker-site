/* Stable loader: disables unstable checkbox-filter enhancer, loads canonical runtime, then enables safe dropdown filters. */
(function(){
  window.__CHECKBOX_FILTERS_V93__ = 1;

  var FILTER_IDS = ['projectStatusFilter','projectOwnerFilter','taskProjectFilter','taskAssigneeFilter'];

  function ensureFilterCss(){
    if(document.getElementById('safe-ms-filter-css')) return;
    var css = document.createElement('style');
    css.id = 'safe-ms-filter-css';
    css.textContent = '.ms-source{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;overflow:hidden!important}.ms-filter{position:relative;min-width:180px}.ms-filter-btn{width:100%;height:42px;display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid #dbe4ef;border-radius:13px;background:#fff;color:#0f172a;padding:0 12px;font-weight:800;cursor:pointer;white-space:nowrap}.ms-filter-btn span{overflow:hidden;text-overflow:ellipsis}.ms-filter-btn:after{content:"▾";color:#64748b;font-size:12px}.ms-filter.open .ms-filter-btn{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.10)}.ms-menu{display:none;position:absolute;left:0;top:calc(100% + 6px);z-index:90;min-width:260px;max-width:360px;max-height:320px;overflow:auto;border:1px solid #dbe4ef;border-radius:16px;background:#fff;box-shadow:0 18px 50px rgba(15,23,42,.16);padding:8px}.ms-filter.open .ms-menu{display:block}.ms-actions{display:flex;gap:6px;padding:4px 4px 8px;border-bottom:1px solid #eef2f7;margin-bottom:6px}.ms-actions button{border:0;border-radius:9px;background:#f1f5f9;color:#334155;font-size:12px;font-weight:800;padding:7px 9px;cursor:pointer}.ms-row{display:flex;align-items:center;gap:9px;padding:8px 7px;border-radius:10px;cursor:pointer;font-size:13px;color:#0f172a}.ms-row:hover{background:#f8fafc}.ms-row input{width:15px;height:15px}.ms-row.all{font-weight:900;border-bottom:1px solid #f1f5f9;margin-bottom:3px}.toolbar .ms-filter{min-width:180px}';
    document.head.appendChild(css);
  }

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }

  function selectedValues(select){
    var values = Array.prototype.slice.call(select.options).filter(function(option){ return option.selected; }).map(function(option){ return option.value; });
    return values.length ? values : ['all'];
  }

  function setSelectedValues(select, values){
    var normalized = values && values.length ? values : ['all'];
    var useAll = normalized.indexOf('all') !== -1;
    Array.prototype.slice.call(select.options).forEach(function(option){
      option.selected = useAll ? option.value === 'all' : normalized.indexOf(option.value) !== -1;
    });
  }

  function labelFor(select){
    var selected = Array.prototype.slice.call(select.options).filter(function(option){ return option.selected && option.value !== 'all'; });
    var all = Array.prototype.slice.call(select.options).find(function(option){ return option.value === 'all'; });
    var values = selectedValues(select);
    if(!selected.length || values.indexOf('all') !== -1) return all ? all.textContent : 'Все';
    if(selected.length === 1) return selected[0].textContent;
    return selected.length + ' выбрано';
  }

  function emitSelectChange(select){
    select.dispatchEvent(new Event('input',{bubbles:true}));
    select.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function refreshButton(select){
    var wrap = select.__safeMsWrap;
    if(!wrap) return;
    var span = wrap.querySelector('.ms-filter-btn span');
    if(span) span.textContent = labelFor(select);
  }

  function rebuildMenu(select){
    var wrap = select.__safeMsWrap;
    if(!wrap) return;
    var list = wrap.querySelector('.ms-list');
    if(!list) return;
    list.innerHTML = Array.prototype.slice.call(select.options).map(function(option){
      return '<label class="ms-row '+(option.value === 'all' ? 'all' : '')+'"><input type="checkbox" value="'+esc(option.value)+'" '+(option.selected ? 'checked' : '')+'><span>'+esc(option.textContent)+'</span></label>';
    }).join('');
    Array.prototype.slice.call(list.querySelectorAll('input[type="checkbox"]')).forEach(function(checkbox){
      checkbox.addEventListener('change',function(){
        var checked = Array.prototype.slice.call(list.querySelectorAll('input[type="checkbox"]:checked')).map(function(input){ return input.value; });
        if(checkbox.value === 'all' && checkbox.checked) checked = ['all'];
        else checked = checked.filter(function(value){ return value !== 'all'; });
        setSelectedValues(select, checked);
        rebuildMenu(select);
        refreshButton(select);
        emitSelectChange(select);
      });
    });
    refreshButton(select);
  }

  function enhanceFilter(select){
    if(!select || select.__safeMsEnhanced) return;
    select.__safeMsEnhanced = true;
    select.multiple = true;
    select.size = 1;
    select.classList.add('ms-source');
    setSelectedValues(select, selectedValues(select));

    var wrap = document.createElement('div');
    wrap.className = 'ms-filter safe-ms-filter';
    wrap.innerHTML = '<button class="ms-filter-btn" type="button"><span></span></button><div class="ms-menu"><div class="ms-actions"><button type="button" data-ms="all">Все</button><button type="button" data-ms="none">Сброс</button></div><div class="ms-list"></div></div>';
    select.parentNode.insertBefore(wrap, select.nextSibling);
    select.__safeMsWrap = wrap;

    wrap.querySelector('.ms-filter-btn').addEventListener('click',function(event){
      event.preventDefault();
      event.stopPropagation();
      document.querySelectorAll('.ms-filter.open').forEach(function(item){ if(item !== wrap) item.classList.remove('open'); });
      rebuildMenu(select);
      wrap.classList.toggle('open');
    });
    wrap.querySelector('[data-ms="all"]').addEventListener('click',function(event){
      event.preventDefault();
      setSelectedValues(select,['all']);
      rebuildMenu(select);
      refreshButton(select);
      emitSelectChange(select);
    });
    wrap.querySelector('[data-ms="none"]').addEventListener('click',function(event){
      event.preventDefault();
      setSelectedValues(select,['all']);
      rebuildMenu(select);
      refreshButton(select);
      emitSelectChange(select);
    });
    rebuildMenu(select);
  }

  function enhanceAllFilters(){
    ensureFilterCss();
    FILTER_IDS.forEach(function(id){ enhanceFilter(document.getElementById(id)); });
    FILTER_IDS.forEach(function(id){ refreshButton(document.getElementById(id)); });
  }

  function scheduleEnhance(){
    [0,150,400,900,1800,3000].forEach(function(delay){ setTimeout(enhanceAllFilters,delay); });
  }

  function installTaskNotificationLayer(){
    if(window.__TASK_NOTIFICATIONS_V1__) return;
    window.__TASK_NOTIFICATIONS_V1__ = true;

    var READ_KEY = 'pt_task_notifications_read_v1';
    var OPEN_KEY = 'pt_task_notifications_open_v1';
    var state = { assignees: [], comments: [], notifications: [], channel: null, ready: false };

    function readMap(){
      try { return JSON.parse(localStorage.getItem(READ_KEY) || '{}') || {}; } catch(e) { return {}; }
    }
    function saveReadMap(map){
      try { localStorage.setItem(READ_KEY, JSON.stringify(map || {})); } catch(e) {}
    }
    function profile(){ return window.currentProfile || null; }
    function client(){ return window.sb || null; }
    function tasks(){ return Array.isArray(window.tasks) ? window.tasks : []; }
    function users(){ return Array.isArray(window.users) ? window.users : []; }
    function taskById(id){ return tasks().find(function(t){ return String(t.id) === String(id); }); }
    function userById(id){ return users().find(function(u){ return String(u.id) === String(id); }); }
    function userName(id){
      var u = userById(id);
      return u ? (u.display_name || u.email || 'Пользователь') : 'Пользователь';
    }
    function currentUserId(){ return profile() && profile().id ? profile().id : null; }
    function escapeHtml(value){ return String(value == null ? '' : value).replace(/[&<>"']/g,function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]; }); }
    function escapeRegExp(value){ return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
    function mentionKeys(){
      var p = profile();
      if(!p) return [];
      var raw = [p.display_name || '', p.email ? String(p.email).split('@')[0] : ''];
      raw = raw.concat(String(p.display_name || '').split(/\s+/).filter(Boolean));
      var seen = {};
      return raw.map(function(x){ return String(x || '').trim(); }).filter(function(x){
        var k = x.toLowerCase();
        if(x.length < 2 || seen[k]) return false;
        seen[k] = true;
        return true;
      });
    }
    function mentionsMe(body){
      var text = String(body || '');
      return mentionKeys().some(function(key){
        return new RegExp('(^|\\s)@' + escapeRegExp(key) + '(?=\\s|$|[,.!?:;])','iu').test(text);
      });
    }
    function mentionTokenForUser(u){
      var name = String((u && (u.display_name || u.email)) || '').trim();
      if(!name) return '';
      return '@' + name.split(/\s+/)[0];
    }
    function taskAssignedToMe(t){
      var uid = currentUserId();
      if(!uid || !t) return false;
      if(String(t.assignee_id || '') === String(uid)) return true;
      return state.assignees.some(function(a){ return String(a.task_id) === String(t.id) && String(a.user_id) === String(uid); });
    }
    function notificationRows(){
      var uid = currentUserId();
      if(!uid) return [];
      var rows = [];
      tasks().forEach(function(t){
        if(!t || t.deleted_at || t.status === 'done') return;
        if(!taskAssignedToMe(t)) return;
        rows.push({
          id: 'assign:' + t.id,
          type: 'assigned',
          task_id: t.id,
          created_at: t.updated_at || t.created_at || '',
          title: 'Вам назначена задача',
          body: t.title || 'Задача'
        });
      });
      state.comments.forEach(function(c){
        if(!c || c.deleted_at) return;
        if(String(c.user_id || c.author_id || '') === String(uid)) return;
        if(!mentionsMe(c.body)) return;
        var t = taskById(c.task_id);
        rows.push({
          id: 'mention:' + c.id,
          type: 'mention',
          task_id: c.task_id,
          created_at: c.created_at || '',
          title: 'Вас упомянули в комментарии',
          body: t ? t.title : String(c.body || '').slice(0,120)
        });
      });
      rows.sort(function(a,b){ return String(b.created_at || '').localeCompare(String(a.created_at || '')); });
      return rows;
    }
    function ensureCss(){
      if(document.getElementById('task-notify-v1-css')) return;
      var style = document.createElement('style');
      style.id = 'task-notify-v1-css';
      style.textContent = '.task-notify-wrap{position:relative;display:inline-flex}.task-notify-bell{position:relative}.task-notify-bell.has-unread{background:#0f172a!important;color:#fff!important}.task-notify-count{position:absolute;right:-5px;top:-6px;min-width:18px;height:18px;border-radius:999px;background:#dc2626;color:#fff;font-size:11px;font-weight:900;display:grid;place-items:center;padding:0 4px}.task-notify-panel{position:absolute;right:0;top:calc(100% + 8px);width:min(380px,calc(100vw - 24px));max-height:460px;overflow:auto;border:1px solid #dbe4ef;border-radius:18px;background:#fff;box-shadow:0 24px 80px rgba(15,23,42,.20);z-index:200;padding:10px;display:none}.task-notify-wrap.open .task-notify-panel{display:block}.task-notify-head{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:4px 4px 10px;border-bottom:1px solid #eef2f7;margin-bottom:6px}.task-notify-head b{font-size:14px}.task-notify-head button{border:0;background:#f1f5f9;border-radius:9px;padding:6px 8px;font-size:12px;font-weight:800;cursor:pointer}.task-notify-item{width:100%;border:0;border-radius:13px;background:#fff;text-align:left;padding:10px;cursor:pointer;display:block}.task-notify-item:hover{background:#f8fafc}.task-notify-item.unread{background:#eff6ff}.task-notify-title{font-weight:900;color:#0f172a;font-size:13px}.task-notify-body{font-size:12px;color:#475569;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.task-notify-time{font-size:11px;color:#94a3b8;margin-top:4px}.task-notify-empty{padding:18px;color:#64748b;text-align:center}.task-mention-chips{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.task-mention-chip{border:0;border-radius:999px;background:#eef2ff;color:#3730a3;font-size:12px;font-weight:900;padding:6px 9px;cursor:pointer}.task-mention-chip:hover{background:#dbeafe}.mention-hit{background:#e0f2fe;color:#075985;border-radius:6px;padding:0 3px;font-weight:900}';
      document.head.appendChild(style);
    }
    function ensureBell(){
      ensureCss();
      if(document.getElementById('taskNotifyWrap')) return;
      var top = document.querySelector('.top-actions');
      if(!top) return;
      var wrap = document.createElement('div');
      wrap.id = 'taskNotifyWrap';
      wrap.className = 'task-notify-wrap';
      wrap.innerHTML = '<button type="button" class="btn secondary task-notify-bell" id="taskNotifyBell" title="Уведомления">🔔<span class="task-notify-count hidden" id="taskNotifyCount">0</span></button><div class="task-notify-panel" id="taskNotifyPanel"><div class="task-notify-head"><b>Уведомления</b><button type="button" id="taskNotifyReadAll">Прочитать все</button></div><div id="taskNotifyList"></div></div>';
      top.insertBefore(wrap, top.firstChild);
      document.getElementById('taskNotifyBell').addEventListener('click',function(event){
        event.preventDefault();
        event.stopPropagation();
        wrap.classList.toggle('open');
        try { localStorage.setItem(OPEN_KEY, wrap.classList.contains('open') ? '1' : '0'); } catch(e) {}
        renderBell();
      });
      document.getElementById('taskNotifyReadAll').addEventListener('click',function(event){
        event.preventDefault();
        event.stopPropagation();
        var m = readMap();
        state.notifications.forEach(function(n){ m[n.id] = true; });
        saveReadMap(m);
        renderBell();
      });
      document.addEventListener('click',function(event){
        if(!event.target.closest('#taskNotifyWrap')) wrap.classList.remove('open');
      },true);
    }
    function renderBell(){
      ensureBell();
      state.notifications = notificationRows();
      var read = readMap();
      var unread = state.notifications.filter(function(n){ return !read[n.id]; }).length;
      var count = document.getElementById('taskNotifyCount');
      var bell = document.getElementById('taskNotifyBell');
      var list = document.getElementById('taskNotifyList');
      if(count){ count.textContent = String(unread); count.classList.toggle('hidden', unread < 1); }
      if(bell) bell.classList.toggle('has-unread', unread > 0);
      if(!list) return;
      if(!state.notifications.length){ list.innerHTML = '<div class="task-notify-empty">Нет новых уведомлений</div>'; return; }
      list.innerHTML = state.notifications.slice(0,30).map(function(n){
        var isUnread = !read[n.id];
        var time = n.created_at ? new Date(n.created_at).toLocaleString('ru-RU') : '';
        return '<button type="button" class="task-notify-item '+(isUnread?'unread':'')+'" data-notify-id="'+esc(n.id)+'" data-task-id="'+esc(n.task_id)+'"><div class="task-notify-title">'+esc(n.title)+'</div><div class="task-notify-body">'+esc(n.body)+'</div><div class="task-notify-time">'+esc(time)+'</div></button>';
      }).join('');
      Array.prototype.slice.call(list.querySelectorAll('.task-notify-item')).forEach(function(item){
        item.addEventListener('click',function(event){
          event.preventDefault();
          event.stopPropagation();
          markRead(item.dataset.notifyId);
          openTask(item.dataset.taskId);
        });
      });
    }
    function markRead(id){
      var m = readMap();
      if(id) m[id] = true;
      saveReadMap(m);
      renderBell();
    }
    function openTask(taskId){
      var wrap = document.getElementById('taskNotifyWrap');
      if(wrap) wrap.classList.remove('open');
      var button = document.createElement('button');
      button.type = 'button';
      button.dataset.action = 'open-task';
      button.dataset.id = taskId;
      button.style.display = 'none';
      document.body.appendChild(button);
      button.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
      setTimeout(function(){ button.remove(); ensureTaskCommentsUi(); highlightMentions(); },120);
    }
    function ensureTaskCommentsUi(){
      var form = document.getElementById('taskForm');
      if(!form || document.getElementById('taskCommentsList')) return;
      var actions = form.querySelector('.modal-actions');
      var block = document.createElement('div');
      block.className = 'task-comments-block full';
      block.innerHTML = '<div class="task-comments-head"><b>Комментарии</b><span class="muted">💬 <span id="taskCommentsCount">0</span></span></div><div class="task-mention-chips" id="taskMentionChips"></div><div id="taskCommentsList" class="task-comments-list"><div class="empty">Комментариев пока нет</div></div><div class="task-comment-form"><textarea class="input" id="taskCommentText" placeholder="Написать комментарий. Можно упомянуть пользователя через @Имя"></textarea><button type="button" class="btn primary" data-action="add-task-comment">Отправить</button></div>';
      if(actions) form.insertBefore(block, actions);
      else form.appendChild(block);
      renderMentionChips();
    }
    function renderMentionChips(){
      var box = document.getElementById('taskMentionChips');
      if(!box) return;
      box.innerHTML = users().filter(function(u){ return u && u.id; }).map(function(u){
        var token = mentionTokenForUser(u);
        return token ? '<button type="button" class="task-mention-chip" data-mention="'+esc(token)+'">'+esc(token)+'</button>' : '';
      }).join('');
    }
    function insertMention(token){
      var ta = document.getElementById('taskCommentText');
      if(!ta || !token) return;
      var start = ta.selectionStart || ta.value.length;
      var end = ta.selectionEnd || ta.value.length;
      var before = ta.value.slice(0,start);
      var after = ta.value.slice(end);
      var prefix = before && !/\s$/.test(before) ? ' ' : '';
      ta.value = before + prefix + token + ' ' + after;
      ta.focus();
      var pos = (before + prefix + token + ' ').length;
      try { ta.setSelectionRange(pos,pos); } catch(e) {}
    }
    function highlightMentions(){
      Array.prototype.slice.call(document.querySelectorAll('.task-comment-body')).forEach(function(body){
        if(body.dataset.mentionEnhanced === '1') return;
        var text = body.textContent || '';
        body.innerHTML = escapeHtml(text).replace(/(^|\s)(@[\p{L}\p{N}_.-]+)/gu,function(_,space,token){ return space + '<span class="mention-hit">' + token + '</span>'; });
        body.dataset.mentionEnhanced = '1';
      });
    }
    async function refreshRemote(){
      var sb = client();
      var p = profile();
      if(!sb || !p || !p.id) return;
      ensureBell();
      ensureTaskCommentsUi();
      renderMentionChips();
      try {
        var assignees = await sb.from('task_assignees').select('*').eq('user_id',p.id);
        if(!assignees.error) state.assignees = assignees.data || [];
      } catch(e) {}
      try {
        var comments = await sb.from('task_comments').select('*').is('deleted_at',null).order('created_at',{ascending:false}).limit(250);
        if(!comments.error) state.comments = comments.data || [];
      } catch(e) {}
      state.ready = true;
      renderBell();
      highlightMentions();
    }
    function setupRealtime(){
      var sb = client();
      var p = profile();
      if(!sb || !p || !p.id || state.channel) return;
      try {
        state.channel = sb.channel('task-notifications-v1-' + p.id)
          .on('postgres_changes',{event:'*',schema:'public',table:'tasks'},function(){ setTimeout(refreshRemote,300); })
          .on('postgres_changes',{event:'*',schema:'public',table:'task_assignees'},function(){ setTimeout(refreshRemote,300); })
          .on('postgres_changes',{event:'*',schema:'public',table:'task_comments'},function(){ setTimeout(refreshRemote,300); })
          .subscribe();
      } catch(e) {}
    }
    document.addEventListener('click',function(event){
      var chip = event.target.closest('.task-mention-chip');
      if(chip){ event.preventDefault(); event.stopPropagation(); insertMention(chip.dataset.mention); return; }
      if(event.target.closest('[data-action="open-task"]')) setTimeout(function(){ ensureTaskCommentsUi(); renderMentionChips(); highlightMentions(); },180);
      if(event.target.closest('[data-action="add-task-comment"]')) setTimeout(function(){ refreshRemote(); },650);
    },true);
    var observer = new MutationObserver(function(){ ensureTaskCommentsUi(); renderMentionChips(); highlightMentions(); renderBell(); });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    [0,600,1500,3000,6000].forEach(function(delay){ setTimeout(function(){ refreshRemote(); setupRealtime(); },delay); });
    setInterval(function(){ refreshRemote(); setupRealtime(); },20000);
  }

  function loadRuntime(){
    if(window.__PT_RUNTIME_LOADING__) return;
    window.__PT_RUNTIME_LOADING__ = true;
    var script = document.createElement('script');
    script.src = 'assets/app-runtime.js?v=20260520-calendar-timeline-v1';
    script.async = false;
    script.onload = function(){
      scheduleEnhance();
      installTaskNotificationLayer();
    };
    script.onerror = function(){
      var status = document.getElementById('sideStatusText');
      if(status) status.textContent = 'Не удалось загрузить основной runtime приложения.';
      console.error('Project Tracker runtime failed to load');
    };
    document.head.appendChild(script);
  }

  document.addEventListener('click',function(event){
    if(!event.target.closest('.ms-filter')) document.querySelectorAll('.ms-filter.open').forEach(function(item){ item.classList.remove('open'); });
    if(event.target.closest('.nav button[data-view], #refreshBtn')) scheduleEnhance();
  },true);

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',function(){ loadRuntime(); scheduleEnhance(); },{once:true});
  else { loadRuntime(); scheduleEnhance(); }
  window.addEventListener('load',scheduleEnhance,{once:true});
})();
