(function(){
  'use strict';
  if(window.__PT_WORKSPACE_LAYOUT_V1__) return;
  window.__PT_WORKSPACE_LAYOUT_V1__ = true;
  const KEY = 'pt_workspace_layout_v1';
  const layouts = ['comfortable', 'compact', 'focus'];
  const $ = id => document.getElementById(id);
  const mq = window.matchMedia('(max-width:980px)');
  let frame = 0;
  let layout = document.body.dataset.workspaceLayout || 'compact';
  const openComposers = new Set();
  function setLayout(value, persist = true){
    layout = layouts.includes(value) ? value : 'compact';
    document.body.dataset.workspaceLayout = layout;
    document.body.classList.toggle('compact-workspace', layout !== 'comfortable');
    document.body.classList.toggle('focus-workspace', layout === 'focus');
    if(persist) try{ localStorage.setItem(KEY, layout); }catch{}
    document.querySelectorAll('.workspace-layout-options [data-workspace-layout]').forEach(button => {
      const active = button.dataset.workspaceLayout === layout;
      button.setAttribute('aria-checked', String(active));
      button.classList.toggle('active', active);
    });
    if($('layoutExitFocus')) $('layoutExitFocus').hidden = layout !== 'focus';
    sync();
    window.dispatchEvent(new CustomEvent('workspace-layout-change', {detail:{layout}}));
  }
  function schedule(){
    if(!frame) frame = requestAnimationFrame(() => { frame = 0; sync(); });
  }
  function ensureTaskControls(){
    const toolbar = document.querySelector('#tasks > .toolbar'), mode = $('taskBoardModeToggle');
    if(!toolbar || !mode || $('compactTaskMode')) return;
    const select = document.createElement('select');
    select.id = 'compactTaskMode'; select.className = 'input';
    select.setAttribute('aria-label','Режим отображения задач');
    select.innerHTML = '<option value="status">По статусам</option><option value="assignee">По исполнителям</option><option value="week">По неделе</option>';
    toolbar.insertBefore(select,mode);
    select.addEventListener('change',() => mode.querySelector('[data-task-mode="'+select.value+'"]')?.click());
    new MutationObserver(schedule).observe(mode,{subtree:true,attributes:true,attributeFilter:['class']});
  }
  function sync(){
    ensureTaskControls();
    enhanceNavigation();
    const active = document.querySelector('#taskBoardModeToggle [data-task-mode].active');
    const mode = active?.dataset.taskMode || 'status';
    document.body.dataset.compactTaskMode = mode;
    if($('compactTaskMode')) $('compactTaskMode').value = mode;
    if($('compactDateOpen')) {
      $('compactDateOpen').disabled = mode !== 'week';
      $('compactDateOpen').setAttribute('aria-label', mode === 'week' ? 'Выбрать дату' : 'Текущая колонка');
    }
    const summary = document.querySelector('#mobileTaskFilters > summary');
    // On mobile, the compact toolbar owns this summary's SVG and state.
    // Replacing textContent here removes the funnel icon and leaves a blank button.
    if(summary && !summary.closest('#mobileTaskCompactBar,#tabletTaskBar')){
      let count = 0;
      ['taskProjectFilter','taskAssigneeFilter'].forEach(id => {
        const values = Array.from($(id)?.selectedOptions || []);
        if(values.some(option => option.value !== 'all')) count++;
      });
      if($('taskDateMode') && $('taskDateMode').value !== 'all') count++;
      const label = 'Фильтры' + (count ? ' · ' + count : '') + ' ⌄';
      if(summary.textContent !== label) summary.textContent = label;
      summary.setAttribute('aria-label', count ? 'Открыть фильтры: активно ' + count : 'Открыть фильтры');
    }
    document.querySelectorAll('.wk-sub').forEach(block => {
      const form = block.querySelector('.wk-subadd');
      const header = block.querySelector('.wk-subh');
      if(!form || !header) return;
      if(!header.querySelector('.compact-subadd-toggle')){
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'compact-subadd-toggle';
        button.textContent = '+'; button.setAttribute('aria-label','Добавить подзадачу');
        header.append(button);
      }
      const open = openComposers.has(form.dataset.taskId);
      block.classList.toggle('compact-composer-open', open);
      header.querySelector('.compact-subadd-toggle').setAttribute('aria-expanded', String(open));
    });
  }
  function dateToday(){
    const date = new Date();
    return date.getFullYear() + '-' + String(date.getMonth()+1).padStart(2,'0') + '-' + String(date.getDate()).padStart(2,'0');
  }
  function enhanceNavigation(){
    document.querySelectorAll('.sidebar .nav [data-view]').forEach(button => {
      if(button.querySelector('.compact-nav-icon')) return;
      const parts = button.textContent.trim().match(/^(\S+)\s+([\s\S]+)$/);
      if(!parts) return;
      button.textContent = '';
      const icon = document.createElement('span'); icon.className = 'compact-nav-icon';
      icon.textContent = parts[1]; icon.setAttribute('aria-hidden','true');
      const label = document.createElement('span'); label.className = 'compact-nav-label'; label.textContent = parts[2];
      button.append(icon,label); button.title = parts[2]; button.setAttribute('aria-label',parts[2]);
    });
  }
  function boot(){
    const grid = document.querySelector('#settings .settings-grid');
    if(grid && !$('workspaceLayoutPanel')){
      const panel = document.createElement('section');
      panel.id = 'workspaceLayoutPanel'; panel.className = 'panel';
      panel.innerHTML = '<h3>Рабочее пространство</h3><p class="muted">Плотность интерфейса сохраняется на этом устройстве. Все функции доступны в любом режиме.</p><div class="workspace-layout-options" role="radiogroup" aria-label="Плотность интерфейса"><button class="btn secondary" type="button" role="radio" data-workspace-layout="comfortable">Комфортный</button><button class="btn secondary" type="button" role="radio" data-workspace-layout="compact">Компактный</button><button class="btn secondary" type="button" role="radio" data-workspace-layout="focus">Фокус</button></div><p class="muted">Компактный: больше места задачам. Фокус: минимум второстепенных элементов.</p>';
      grid.prepend(panel);
    }
    const top = document.querySelector('.top-actions');
    if(top && !$('layoutShowTools')){
      const button = document.createElement('button');
      button.id = 'layoutShowTools'; button.type = 'button'; button.className = 'btn secondary';
      button.textContent = '⌕'; button.title = 'Поиск и фильтры';
      button.setAttribute('aria-label',button.title); button.setAttribute('aria-expanded','false'); top.prepend(button);
    }
    if(top && !$('layoutExitFocus')){
      const button = document.createElement('button');
      button.id = 'layoutExitFocus'; button.type = 'button'; button.className = 'btn secondary';
      button.textContent = '↗'; button.title = 'Выйти из режима фокуса';
      button.setAttribute('aria-label', button.title); top.prepend(button);
    }
    const nav = document.querySelector('.sidebar .nav');
    if(nav){
      enhanceNavigation();
      new MutationObserver(schedule).observe(nav,{childList:true});
      const sidebar = nav.closest('.sidebar');
      const toggle = document.createElement('button');
      toggle.type = 'button'; toggle.className = 'btn secondary compact-sidebar-toggle';
      toggle.textContent = '☰'; toggle.setAttribute('aria-label','Развернуть меню');
      toggle.setAttribute('aria-expanded','false'); sidebar.prepend(toggle);
      toggle.addEventListener('click',() => {
        const expanded = document.body.classList.toggle('compact-nav-expanded');
        toggle.setAttribute('aria-expanded',String(expanded));
        toggle.setAttribute('aria-label',expanded ? 'Свернуть меню' : 'Развернуть меню');
      });
    }
    const toolbar = document.querySelector('#tasks > .toolbar');
    if(toolbar){
      toolbar.addEventListener('change',schedule);
      new MutationObserver(schedule).observe(toolbar,{childList:true});
    }
    document.addEventListener('click',event => {
      const choice = event.target.closest('.workspace-layout-options [data-workspace-layout]');
      if(choice){ setLayout(choice.dataset.workspaceLayout); return; }
      if(event.target.closest('#layoutExitFocus')){ setLayout('compact'); return; }
      if(event.target.closest('#layoutShowTools')){
        const expanded = document.body.classList.toggle('focus-tools-open');
        $('layoutShowTools').setAttribute('aria-expanded',String(expanded)); return;
      }
      // Pointer taps reach the native date input directly, including on
      // iOS Safari. This fallback supports keyboard or assistive activation.
      const dateButton=event.target.closest('#compactDateOpen');
      if(dateButton && !dateButton.disabled){
        event.preventDefault();
        const input=$('compactNativeDate');
        if(input && !input.disabled){
          try{ input.focus({preventScroll:true}); }catch(_err){ input.focus(); }
          if(typeof input.showPicker==='function'){
            try{ input.showPicker(); return; }catch(_err){}
          }
          try{ input.click(); }catch(_err){}
        }
        return;
      }
      const add = event.target.closest('.compact-subadd-toggle');
      if(add){
        const block = add.closest('.wk-sub'), form = block.querySelector('.wk-subadd');
        const id = form.dataset.taskId, open = !openComposers.has(id);
        if(open) openComposers.add(id); else openComposers.delete(id);
        sync(); if(open) form.querySelector('input')?.focus({preventScroll:true});
      }
    });
    document.addEventListener('keydown',event => {
      if(event.key === 'Escape'){
        document.querySelector('#mobileTaskFilters')?.removeAttribute('open');
        if(document.body.classList.contains('focus-workspace') && !document.querySelector('dialog[open]')) setLayout('compact');
      }
    });
    const board = $('kanban');
    if(board) new MutationObserver(schedule).observe(board,{childList:true,attributes:true,attributeFilter:['data-task-mode']});
    const focus = $('focusList');
    if(focus) new MutationObserver(schedule).observe(focus,{childList:true});
    mq.addEventListener('change',schedule);
    setLayout(layout,false);
  }
  window.ProjectTrackerLayout = {get:()=>layout,set:setLayout};
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
