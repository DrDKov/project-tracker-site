/* Workspace mention dropdown fix v3: fetch app_users directly for @ picker inside task dialog, no static hint. */
(function(){
  if(window.__MENTION_DROPDOWN_FIX_V3__) return;
  window.__MENTION_DROPDOWN_FIX_V3__ = 1;

  var state = { members:[], membersLoadedAt:0, appUsers:[], usersLoadedAt:0, timer:null, activeTextarea:null };
  var TTL = 45000;

  function $(id){ return document.getElementById(id); }
  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }
  function localUsers(){ try{ return Array.isArray(window.users) ? window.users : []; }catch(e){ return []; } }
  function users(){
    var seen = new Set(), out = [];
    localUsers().concat(state.appUsers || []).forEach(function(u){
      if(!u || !u.id || seen.has(u.id)) return;
      seen.add(u.id);
      out.push(u);
    });
    return out;
  }
  function projects(){ try{ return Array.isArray(window.projects) ? window.projects : []; }catch(e){ return []; } }
  function assignees(){ try{ return Array.isArray(window.taskAssigneesV4) ? window.taskAssigneesV4 : []; }catch(e){ return []; } }
  function tasks(){ try{ return Array.isArray(window.tasks) ? window.tasks : []; }catch(e){ return []; } }
  function profile(){ try{ return window.currentProfile || null; }catch(e){ return null; } }
  function sb(){ try{ return window.sb || null; }catch(e){ return null; } }
  function displayName(user){ return (user && (user.display_name || user.email)) || 'Пользователь'; }
  function initials(user){ return displayName(user).slice(0,2).toUpperCase(); }

  function ensureCss(){
    if($('mention-dropdown-fix-css')) return;
    var st = document.createElement('style');
    st.id = 'mention-dropdown-fix-css';
    st.textContent = '.mention-hint{display:none!important}.mention-fix-menu{position:fixed;z-index:2147483647;width:min(340px,calc(100vw - 24px));max-height:260px;overflow:auto;border:1px solid #dbe4ef;border-radius:14px;background:#fff;box-shadow:0 20px 54px rgba(15,23,42,.22);padding:6px;display:none}.mention-fix-menu.open{display:block}.mention-fix-option{display:flex;align-items:center;gap:8px;width:100%;border:0;background:transparent;color:#0f172a;text-align:left;border-radius:10px;padding:8px 9px;cursor:pointer}.mention-fix-option:hover,.mention-fix-option.active{background:#eff6ff}.mention-fix-avatar{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:#e2e8f0;color:#334155;font-size:11px;font-weight:900;flex:0 0 auto}.mention-fix-main{min-width:0}.mention-fix-main b{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mention-fix-main span{display:block;font-size:12px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mention-fix-empty{padding:9px 10px;color:#64748b;font-size:13px}';
    document.head.appendChild(st);
  }

  function removeOldHints(){
    document.querySelectorAll('.mention-hint').forEach(function(el){ if(el && el.parentNode) el.parentNode.removeChild(el); });
  }

  function commentTextareaFromTarget(target){
    if(target && target.id === 'taskCommentText') return target;
    if(target && target.matches && target.matches('textarea') && target.closest('.task-comment-form,.task-comments-block,#taskModal,dialog')) return target;
    return $('taskCommentText') || document.querySelector('#taskModal textarea, dialog textarea, .task-comments-block textarea, .task-comment-form textarea');
  }

  function ensureMenu(ta){
    ensureCss();
    removeOldHints();
    var menu = $('mentionFixMenu');
    if(!menu){
      menu = document.createElement('div');
      menu.id = 'mentionFixMenu';
      menu.className = 'mention-fix-menu';
    }
    var host = (ta && ta.closest && ta.closest('dialog')) || $('taskModal') || document.body;
    if(menu.parentNode !== host) host.appendChild(menu);
    return menu;
  }

  function hideMenu(){
    var menu = $('mentionFixMenu');
    if(menu) menu.classList.remove('open');
  }

  function mentionQuery(text,pos){
    var before = String(text || '').slice(0,pos == null ? 0 : pos);
    var at = before.lastIndexOf('@');
    if(at < 0) return null;
    var chunk = before.slice(at + 1);
    if(chunk.length > 60) return null;
    if(/[\n\r]/.test(chunk)) return null;
    if(/[,;.!?()\[\]{}]/.test(chunk)) return null;
    return {start:at, query:chunk.trim().toLowerCase()};
  }

  async function refreshUsers(force){
    var api = sb();
    if(!api) return state.appUsers;
    if(!force && Date.now() - state.usersLoadedAt < TTL && state.appUsers.length) return state.appUsers;
    try{
      var r = await api.from('app_users').select('id,display_name,email,role,is_active').order('display_name',{ascending:true});
      if(!r.error && Array.isArray(r.data)){
        state.appUsers = r.data;
        state.usersLoadedAt = Date.now();
        try{ window.users = users(); }catch(e){}
      }
    }catch(e){}
    return state.appUsers;
  }

  async function refreshMembers(force){
    var api = sb();
    if(!api) return state.members;
    if(!force && Date.now() - state.membersLoadedAt < TTL) return state.members;
    try{
      var r = await api.from('project_members').select('*').order('created_at',{ascending:true});
      if(!r.error && Array.isArray(r.data)){
        state.members = r.data;
        state.membersLoadedAt = Date.now();
      }
    }catch(e){}
    return state.members;
  }

  function currentUserFromList(){
    var me = profile();
    if(!me || !me.id) return me;
    return users().find(function(u){ return u && u.id === me.id; }) || me;
  }

  function isOwnerProfile(){
    var me = currentUserFromList();
    return !!(me && me.role === 'owner');
  }

  function projectIdsForUser(userId){
    var ids = new Set();
    projects().forEach(function(p){ if(p && p.owner_id === userId && !p.deleted_at) ids.add(p.id); });
    state.members.forEach(function(m){ if(m && m.user_id === userId) ids.add(m.project_id); });
    tasks().forEach(function(t){ if(t && t.assignee_id === userId && t.project_id && !t.deleted_at) ids.add(t.project_id); });
    assignees().forEach(function(a){
      if(a && a.user_id === userId){
        var t = tasks().find(function(x){ return x && x.id === a.task_id; });
        if(t && t.project_id && !t.deleted_at) ids.add(t.project_id);
      }
    });
    return ids;
  }

  function allowedUsers(){
    var me = currentUserFromList();
    var all = users().filter(function(u){ return u && u.id && (!me || u.id !== me.id) && u.is_active !== false; });
    if(!me || !me.id) return all;
    if(isOwnerProfile()) return all;
    var myProjects = projectIdsForUser(me.id);
    var allowed = new Set();
    projects().forEach(function(p){ if(p && myProjects.has(p.id) && p.owner_id) allowed.add(p.owner_id); });
    state.members.forEach(function(m){ if(m && myProjects.has(m.project_id) && m.user_id) allowed.add(m.user_id); });
    tasks().forEach(function(t){ if(t && myProjects.has(t.project_id) && t.assignee_id) allowed.add(t.assignee_id); });
    assignees().forEach(function(a){
      var t = tasks().find(function(x){ return x && x.id === a.task_id; });
      if(t && myProjects.has(t.project_id) && a.user_id) allowed.add(a.user_id);
    });
    var out = all.filter(function(u){ return allowed.has(u.id); });
    return out.length ? out : all;
  }

  function positionMenu(menu,ta){
    var r = ta.getBoundingClientRect();
    var left = Math.max(10,Math.min(r.left,window.innerWidth - 360));
    var top = r.bottom + 6;
    if(top > window.innerHeight - 280) top = Math.max(10,r.top - 268);
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
  }

  function renderMenu(ta,list,q){
    var menu = ensureMenu(ta);
    positionMenu(menu,ta);
    if(!list.length){
      menu.innerHTML = '<div class="mention-fix-empty">Нет доступных пользователей</div>';
      menu.classList.add('open');
      return;
    }
    menu.innerHTML = list.slice(0,12).map(function(u){
      return '<button type="button" class="mention-fix-option" data-mention-fix-user="'+esc(u.id)+'"><span class="mention-fix-avatar">'+esc(initials(u))+'</span><span class="mention-fix-main"><b>'+esc(displayName(u))+'</b><span>'+esc(u.email || '')+'</span></span></button>';
    }).join('');
    menu.dataset.query = q || '';
    menu.classList.add('open');
  }

  async function updateMenu(force){
    var ta = state.activeTextarea || commentTextareaFromTarget(document.activeElement);
    if(!ta || document.activeElement !== ta){ hideMenu(); return; }
    var q = mentionQuery(ta.value,ta.selectionStart);
    if(!q){ hideMenu(); return; }
    await Promise.all([refreshUsers(!!force || !users().length), refreshMembers(!!force || !state.membersLoadedAt)]);
    var list = allowedUsers().filter(function(u){
      var hay = [u.display_name || '',u.email || ''].join(' ').toLowerCase();
      return !q.query || hay.indexOf(q.query) !== -1;
    });
    renderMenu(ta,list,q.query);
  }

  function insertMention(userId){
    var ta = state.activeTextarea || commentTextareaFromTarget(document.activeElement);
    var user = users().find(function(u){ return u && u.id === userId; });
    if(!ta || !user) return;
    var q = mentionQuery(ta.value,ta.selectionStart);
    if(!q) return;
    var label = '@' + displayName(user) + ' ';
    ta.value = ta.value.slice(0,q.start) + label + ta.value.slice(ta.selectionStart);
    var pos = q.start + label.length;
    ta.focus();
    ta.setSelectionRange(pos,pos);
    ta.dispatchEvent(new Event('input',{bubbles:true}));
    hideMenu();
  }

  function scheduleUpdate(force,target){
    var ta = commentTextareaFromTarget(target || document.activeElement);
    if(ta) state.activeTextarea = ta;
    clearTimeout(state.timer);
    state.timer = setTimeout(function(){ updateMenu(force); },30);
  }

  document.addEventListener('input',function(e){
    var ta = commentTextareaFromTarget(e.target);
    if(ta && e.target === ta) scheduleUpdate(false,ta);
  },true);
  document.addEventListener('keyup',function(e){
    var ta = commentTextareaFromTarget(e.target);
    if(ta && e.target === ta) scheduleUpdate(false,ta);
  },true);
  document.addEventListener('click',function(e){
    var pick = e.target.closest('[data-mention-fix-user]');
    if(pick){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      insertMention(pick.getAttribute('data-mention-fix-user'));
      return;
    }
    var ta = commentTextareaFromTarget(e.target);
    if(ta && e.target === ta){
      scheduleUpdate(true,ta);
      return;
    }
    if(!e.target.closest('#mentionFixMenu')) hideMenu();
  },true);
  document.addEventListener('focusin',function(e){
    var ta = commentTextareaFromTarget(e.target);
    if(ta && e.target === ta) scheduleUpdate(true,ta);
  },true);
  document.addEventListener('keydown',function(e){
    var ta = commentTextareaFromTarget(e.target);
    if(ta && e.target === ta) state.activeTextarea = ta;
    var menu = $('mentionFixMenu');
    if(!menu || !menu.classList.contains('open')) return;
    if(e.key === 'Escape'){
      hideMenu();
      return;
    }
    if(e.key === 'Enter' || e.key === 'Tab'){
      var first = menu.querySelector('[data-mention-fix-user]');
      if(first){
        e.preventDefault();
        insertMention(first.getAttribute('data-mention-fix-user'));
      }
    }
  },true);

  function boot(){
    ensureCss();
    removeOldHints();
    refreshUsers(true);
    setInterval(removeOldHints,500);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
