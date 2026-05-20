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

  function loadRuntime(){
    if(window.__PT_RUNTIME_LOADING__) return;
    window.__PT_RUNTIME_LOADING__ = true;
    var script = document.createElement('script');
    script.src = 'assets/app-runtime.js?v=20260520-calendar-timeline-v1';
    script.async = false;
    script.onload = scheduleEnhance;
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

/* Task links client v1: native task relation UI without a separate screen. */
(function(){
  if(window.__TASK_LINKS_CLIENT_V1__) return;
  window.__TASK_LINKS_CLIENT_V1__ = true;

  var links = [];
  var loaded = false;
  var loading = false;
  var focusTimelineTask = null;

  function $(id){ return document.getElementById(id); }
  function qa(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g,function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]; }); }
  function tasks(){ return Array.isArray(window.tasks) ? window.tasks : []; }
  function projects(){ return Array.isArray(window.projects) ? window.projects : []; }
  function sb(){ return window.sb || null; }
  function profile(){ return window.currentProfile || null; }
  function byId(id){ return tasks().find(function(t){ return t && t.id === id; }); }
  function projectName(id){ var p = projects().find(function(x){ return x && x.id === id; }); return p ? p.name : '—'; }
  function isDone(t){ return !t || t.status === 'done' || !!t.completed_at; }
  function dateTimeValue(t,end){
    if(!t) return 0;
    var d = (end ? (t.due_date || t.start_date || t.recurrence_date) : (t.start_date || t.recurrence_date || t.due_date)) || new Date().toISOString().slice(0,10);
    var tm = end ? (t.end_time || t.start_time || '23:59') : (t.start_time || '00:00');
    return new Date(String(d).slice(0,10)+'T'+String(tm).slice(0,5)+':00').getTime();
  }
  function incomingBlocks(id,active){ return links.filter(function(l){ return l.type === 'blocks' && l.target_task_id === id; }).filter(function(l){ return !active || !isDone(byId(l.source_task_id)); }); }
  function outgoingBlocks(id,active){ return links.filter(function(l){ return l.type === 'blocks' && l.source_task_id === id; }).filter(function(l){ return !active || !isDone(byId(l.target_task_id)); }); }
  function relatedLinks(id){ return links.filter(function(l){ return l.type === 'relates_to' && (l.source_task_id === id || l.target_task_id === id); }); }
  function counts(t){ var id = t && t.id; return id ? {wait:incomingBlocks(id,true).length, blocks:outgoingBlocks(id,true).length, rel:relatedLinks(id).length} : {wait:0,blocks:0,rel:0}; }
  function badges(t){
    var c = counts(t), out = [];
    if(c.wait) out.push('<span class="tlb wait">Ждёт: '+c.wait+'</span>');
    if(c.blocks) out.push('<span class="tlb block">Блокирует: '+c.blocks+'</span>');
    if(c.rel) out.push('<span class="tlb rel">Связи: '+c.rel+'</span>');
    return out.length ? '<div class="tlbs">'+out.join('')+'</div>' : '';
  }
  function otherId(l,id){ return l.source_task_id === id ? l.target_task_id : l.source_task_id; }
  function title(t){ return t ? esc(t.title)+' <small>'+esc(projectName(t.project_id))+' · '+(isDone(t)?'завершено':esc(t.status || ''))+'</small>' : '—'; }
  function row(l,id){
    var oid = l.type === 'blocks' ? (l.source_task_id === id ? l.target_task_id : l.source_task_id) : otherId(l,id);
    var t = byId(oid);
    return '<div class="task-link-row '+(isDone(t)?'done':'')+'"><button type="button" data-action="open-linked-task-client" data-id="'+(t ? t.id : '')+'">'+title(t)+'</button><button type="button" class="x" data-action="delete-task-link-client" data-id="'+l.id+'">×</button></div>';
  }
  function options(id){
    return tasks().filter(function(t){ return t && !t.deleted_at && t.id !== id; }).sort(function(a,b){ return String(a.title||'').localeCompare(String(b.title||''),'ru'); }).map(function(t){ return '<option value="'+esc(t.title)+' ['+t.id+']">'+esc(projectName(t.project_id))+'</option>'; }).join('');
  }
  function resolveTarget(value){
    value = String(value || '').trim();
    var m = value.match(/\[([0-9a-fA-F-]{30,})\]$/);
    if(m) return m[1];
    var q = value.toLowerCase();
    var t = tasks().find(function(x){ return String(x.title||'').toLowerCase() === q; }) || tasks().find(function(x){ return String(x.title||'').toLowerCase().indexOf(q) !== -1; });
    return t ? t.id : null;
  }
  function linkExists(source,target,type){
    return links.some(function(l){ return l.type === type && ((l.source_task_id === source && l.target_task_id === target) || (type === 'relates_to' && l.source_task_id === target && l.target_task_id === source)); });
  }
  function createsCycle(source,target){
    var seen = new Set();
    function walk(id){
      if(id === source) return true;
      if(seen.has(id)) return false;
      seen.add(id);
      return links.filter(function(l){ return l.type === 'blocks' && l.source_task_id === id; }).some(function(l){ return walk(l.target_task_id); });
    }
    return walk(target);
  }
  async function loadLinks(){
    if(loading || !sb()) return;
    loading = true;
    try{
      var r = await sb().from('task_links').select('*').order('created_at',{ascending:true});
      if(!r.error){ links = r.data || []; loaded = true; window.taskLinksV1 = links; }
      else console.warn('[task_links]', r.error.message);
    }catch(e){ console.warn('[task_links]', e); }
    finally{ loading = false; }
  }
  function ensureCss(){
    if($('task-links-client-css')) return;
    var s = document.createElement('style');
    s.id = 'task-links-client-css';
    s.textContent = '.task-links-box{border:1px solid #e5e7eb;border-radius:14px;background:#fff;padding:10px;margin-top:10px}.task-links-box summary{cursor:pointer;font-weight:800}.task-link-sec{display:grid;gap:6px;margin:10px 0}.task-link-row{display:grid;grid-template-columns:1fr 26px;gap:6px;align-items:center;border:1px solid #eef2f7;border-radius:10px;background:#f8fafc;padding:6px}.task-link-row.done{opacity:.58}.task-link-row button:first-child{border:0;background:transparent;text-align:left;font-weight:700;cursor:pointer}.task-link-row small{display:block;color:#64748b;font-weight:400}.task-link-row .x{border:0;border-radius:8px;background:#fee2e2;color:#991b1b;font-weight:900;cursor:pointer}.task-link-add{display:grid;grid-template-columns:1fr 150px auto;gap:8px;align-items:end;border-top:1px solid #eef2f7;padding-top:10px}.task-link-add b{grid-column:1/-1}.tlbs{display:flex;gap:4px;flex-wrap:wrap;margin:4px 0}.tlb{display:inline-flex;border-radius:999px;border:1px solid #dbe4ef;background:#f8fafc;color:#475569;padding:2px 6px;font-size:11px;font-weight:800}.tlb.wait{background:#fff7ed;color:#9a3412;border-color:#fed7aa}.tlb.block{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe}.tlb.rel{background:#f5f3ff;color:#6d28d9;border-color:#ddd6fe}.task-link-filterbar{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}.task-link-filterbar .active{background:#0f172a!important;color:#fff!important}.task-card.task-link-blocked{box-shadow:inset 3px 0 0 #f97316}.timeline-event.task-link-conflict,.wk-tlitem.task-link-conflict{outline:2px solid #f97316!important;box-shadow:0 0 0 3px rgba(249,115,22,.16)!important}.timeline-event.task-link-focus,.wk-tlitem.task-link-focus{outline:2px solid #2563eb!important}.timeline-event.task-link-linked,.wk-tlitem.task-link-linked{outline:2px dashed #7c3aed!important}@media(max-width:720px){.task-link-add{grid-template-columns:1fr}.task-link-add b{grid-column:auto}}';
    document.head.appendChild(s);
  }
  function ensureBox(){
    ensureCss();
    if($('taskLinksBox')) return $('taskLinksBox');
    var anchor = $('taskRecurrenceScopeBox') || $('taskRepeatExistingNote') || ($('taskNotes') && $('taskNotes').closest('label')) || ($('taskDue') && $('taskDue').closest('label'));
    if(!anchor || !anchor.parentNode) return null;
    var box = document.createElement('div');
    box.id = 'taskLinksBox';
    box.className = 'full task-links-box';
    anchor.parentNode.insertBefore(box, anchor.nextSibling);
    return box;
  }
  async function renderModalLinks(){
    var id = $('taskId') ? $('taskId').value : '';
    var box = ensureBox();
    if(!box) return;
    if(!loaded) await loadLinks();
    if(!id){ box.innerHTML = '<details><summary>Связи</summary><div class="muted">Сохраните задачу, чтобы добавить связи.</div></details>'; return; }
    var i = incomingBlocks(id,false), o = outgoingBlocks(id,false), r = relatedLinks(id);
    box.innerHTML = '<details open><summary>Связи '+badges(byId(id))+'</summary><div class="task-link-sec"><b>Ждёт выполнения</b>'+(i.length?i.map(function(l){return row(l,id);}).join(''):'<div class="muted">Нет блокирующих задач.</div>')+'</div><div class="task-link-sec"><b>Блокирует</b>'+(o.length?o.map(function(l){return row(l,id);}).join(''):'<div class="muted">Нет зависимых задач.</div>')+'</div><div class="task-link-sec"><b>Связанные задачи</b>'+(r.length?r.map(function(l){return row(l,id);}).join(''):'<div class="muted">Нет связанных задач.</div>')+'</div><div class="task-link-add"><b>Добавить связь</b><input class="input" id="taskLinkSearch" list="taskLinkOptions" placeholder="Начните вводить название задачи"><datalist id="taskLinkOptions">'+options(id)+'</datalist><select class="input" id="taskLinkType"><option value="blocks">Блокирует</option><option value="relates_to">Связана с</option></select><button type="button" class="btn sm primary" data-action="add-task-link-client" data-id="'+id+'">Добавить связь</button></div></details>';
  }
  async function createLink(current,target,type){
    if(!current || !target) return alert('Выберите связанную задачу');
    if(current === target) return alert('Задача не может блокировать сама себя');
    if(linkExists(current,target,type)) return alert('Эта задача уже связана');
    if(type === 'blocks' && createsCycle(current,target)) return alert('Нельзя создать циклическую блокировку');
    var r = await sb().from('task_links').insert({source_task_id:current,target_task_id:target,type:type,created_by:profile() ? profile().id : null}).select().single();
    if(r.error) return alert(String(r.error.message||'').indexOf('duplicate') !== -1 ? 'Эта задача уже связана' : r.error.message);
    links.push(r.data); window.taskLinksV1 = links; renderModalLinks(); annotateAll();
  }
  async function deleteLink(id){
    var r = await sb().from('task_links').delete().eq('id',id);
    if(r.error) return alert(r.error.message);
    links = links.filter(function(l){ return l.id !== id; }); window.taskLinksV1 = links; renderModalLinks(); annotateAll();
  }
  function cardId(card){ var b = card.querySelector('[data-action="open-task"][data-id],[data-action="edit-task"][data-id],[data-id]'); return card.dataset.id || (b && b.dataset.id) || card.getAttribute('data-task-id') || ''; }
  function injectFilters(){
    var root = $('tasks');
    if(!root || $('taskLinkFilterBar')) return;
    var bar = document.createElement('div');
    bar.id = 'taskLinkFilterBar';
    bar.className = 'task-link-filterbar';
    bar.innerHTML = '<button class="btn sm secondary" data-action="task-link-filter-client" data-filter="all">Все</button><button class="btn sm secondary" data-action="task-link-filter-client" data-filter="blocked">Заблокированные</button><button class="btn sm secondary" data-action="task-link-filter-client" data-filter="blocking">Блокирующие другие</button><button class="btn sm secondary" data-action="task-link-filter-client" data-filter="ready">Можно делать сейчас</button>';
    root.prepend(bar);
  }
  function applyFilter(){
    var f = window.__taskLinkFilter || localStorage.getItem('pt_task_link_filter') || 'all';
    qa('#taskLinkFilterBar [data-filter]').forEach(function(b){ b.classList.toggle('active', b.dataset.filter === f); });
    qa('.task-card').forEach(function(c){
      var t = byId(cardId(c)); var ok = true;
      if(t){ if(f === 'blocked') ok = counts(t).wait > 0; if(f === 'blocking') ok = counts(t).blocks > 0; if(f === 'ready') ok = counts(t).wait === 0; }
      c.style.display = ok ? '' : 'none';
    });
  }
  function annotateCards(){
    injectFilters();
    qa('.task-card').forEach(function(c){
      var t = byId(cardId(c)); if(!t) return;
      c.querySelectorAll('.tlbs').forEach(function(x){ x.remove(); });
      var h = c.querySelector('h4') || c.querySelector('.task-title') || c.firstElementChild;
      var html = badges(t); if(html && h) h.insertAdjacentHTML('afterend', html);
      c.classList.toggle('task-link-blocked', counts(t).wait > 0);
    });
    applyFilter();
  }
  function timelineConflict(t){ return incomingBlocks(t.id,true).some(function(l){ return dateTimeValue(byId(l.source_task_id),true) > dateTimeValue(t,false); }); }
  function linkedIds(id){ var s = new Set(); links.forEach(function(l){ if(l.source_task_id === id) s.add(l.target_task_id); if(l.target_task_id === id) s.add(l.source_task_id); }); return s; }
  function annotateTimeline(){
    qa('.timeline-event[data-id],.wk-tlitem[data-id]').forEach(function(e){
      var t = byId(e.dataset.id); if(!t) return;
      e.classList.toggle('task-link-conflict', timelineConflict(t));
      var set = focusTimelineTask ? linkedIds(focusTimelineTask) : new Set();
      e.classList.toggle('task-link-focus', focusTimelineTask === t.id);
      e.classList.toggle('task-link-linked', set.has(t.id));
    });
  }
  function annotateAll(){ annotateCards(); annotateTimeline(); }

  document.addEventListener('click',function(e){
    var b = e.target.closest && e.target.closest('[data-action]');
    if(!b) return;
    var a = b.dataset.action;
    if(a === 'add-task-link-client'){ e.preventDefault(); createLink(b.dataset.id, resolveTarget($('taskLinkSearch') && $('taskLinkSearch').value), ($('taskLinkType') && $('taskLinkType').value) || 'blocks'); }
    if(a === 'delete-task-link-client'){ e.preventDefault(); deleteLink(b.dataset.id); }
    if(a === 'open-linked-task-client'){ e.preventDefault(); var target = document.querySelector('[data-action="open-task"][data-id="'+b.dataset.id+'"],[data-action="edit-task"][data-id="'+b.dataset.id+'"]'); if(target) target.click(); }
    if(a === 'task-link-filter-client'){ e.preventDefault(); window.__taskLinkFilter = b.dataset.filter || 'all'; localStorage.setItem('pt_task_link_filter', window.__taskLinkFilter); applyFilter(); }
    if((a === 'tl-open' || a === 'open-task' || a === 'edit-task') && b.dataset.id){ focusTimelineTask = b.dataset.id; setTimeout(function(){ renderModalLinks(); annotateTimeline(); },80); }
  },true);

  function tick(){
    if(sb() && !loaded && !loading) loadLinks().then(annotateAll);
    var modal = $('taskModal');
    if(modal && modal.open) renderModalLinks();
    annotateAll();
  }
  var mo = new MutationObserver(function(){ setTimeout(tick,80); });
  if(document.body) mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','class','style']});
  [500,1200,2500,5000].forEach(function(ms){ setTimeout(tick,ms); });
  window.addEventListener('load',tick,{once:true});
})();
