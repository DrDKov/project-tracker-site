/* Mobile task controls: one compact row, search on demand, filters and view menu. */
(function(){
  'use strict';
  if(window.__PT_MOBILE_TASK_COMPACT_V1__)return;
  window.__PT_MOBILE_TASK_COMPACT_V1__=true;
  const mq=window.matchMedia?.('(max-width:980px)')||{matches:false};
  const $=id=>document.getElementById(id);
  const modes={week:{name:'Неделя',symbol:'▦'},assignee:{name:'Исполнители',symbol:'♙'},status:{name:'Статусы',symbol:'☷'}};
  let attempts=0;
  let installed=false;
  let observer=null;
  const icon=(paths)=>'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths+'</svg>';
  const searchIcon=icon('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>');
  const closeIcon=icon('<path d="M18 6 6 18M6 6l12 12"/>');
  const funnel=icon('<path d="M4 5h16l-6.5 7.5V19l-3 1v-7.5z"/>');
  const viewIcon=icon('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M10 10v10"/>');

  function activeMode(){
    return document.querySelector('#taskBoardModeToggle [data-task-mode].active')?.dataset.taskMode||'week';
  }
  function closeMode(){
    const wrap=$('mobileTaskView');
    if(!wrap)return;
    wrap.classList.remove('open');
    $('mobileTaskViewBtn')?.setAttribute('aria-expanded','false');
  }
  function updateMode(){
    const current=activeMode(),btn=$('mobileTaskViewBtn');
    if(btn){
      btn.querySelector('.mobile-task-view-label').textContent=modes[current]?.name||'Неделя';
      btn.setAttribute('aria-label','Отображение задач: '+(modes[current]?.name||'Неделя'));
    }
    document.querySelectorAll('#mobileTaskView [data-mobile-task-mode]').forEach(x=>{
      const selected=x.dataset.mobileTaskMode===current;
      x.classList.toggle('selected',selected);
      x.setAttribute('aria-checked',String(selected));
    });
  }
  function updateFilterState(){
    const el=$('mobileTaskFilters');
    if(!el)return;
    const selected=ids=>{
      const values=[...($(ids)?.selectedOptions||[])].map(x=>x.value);
      return values.length>0&&!values.includes('all');
    };
    const date=$('taskDateMode')?.value||'all';
    const done=$('taskShowDoneToggle');
    const nondefault=selected('taskProjectFilter')||selected('taskAssigneeFilter')||
      date!=='all'||done?.checked===false;
    el.classList.toggle('mobile-filter-active',!!nondefault);
    el.querySelector('summary')?.setAttribute('aria-label',nondefault?'Фильтры задач, применены':'Открыть фильтры задач');
  }
  function toggleSearch(force){
    const toolbar=document.querySelector('#tasks>.toolbar');
    if(!toolbar)return;
    const enabled=typeof force==='boolean'?force:!toolbar.classList.contains('mobile-task-search-open');
    toolbar.classList.toggle('mobile-task-search-open',enabled);
    $('mobileTaskCompactBar')?.classList.toggle('mobile-task-search-open',enabled);
    const button=$('mobileTaskSearchBtn'),search=$('taskSearch');
    if(button){
      button.innerHTML=enabled?closeIcon:searchIcon;
      button.setAttribute('aria-label',enabled?'Закрыть поиск':'Поиск по задачам');
      button.setAttribute('aria-expanded',String(enabled));
    }
    if(search){
      search.setAttribute('aria-hidden',String(!enabled&&mq.matches));
      search.tabIndex=!enabled&&mq.matches?-1:0;
      if(enabled)search.focus({preventScroll:true});
    }
    closeMode();
    if(enabled)$('mobileTaskFilters')?.removeAttribute('open');
    syncSearchState();
  }
  function syncSearchState(){
    $('mobileTaskSearchBtn')?.classList.toggle('has-search',!!$('taskSearch')?.value?.trim());
  }
  function createControl(id,html){
    const node=document.createElement('div');
    node.id=id;
    node.innerHTML=html;
    return node;
  }
  function install(){
    const toolbar=document.querySelector('#tasks>.toolbar');
    const filter=$('mobileTaskFilters'),mode=$('taskBoardModeToggle');
    const done=$('taskShowDoneWrap');
    if(!toolbar||!filter||!mode||!done){
      if(attempts++<100)setTimeout(install,100);
      return;
    }
    if(installed){updateMode();updateFilterState();syncSearchState();return}
    installed=true;
    // Isolate the three visible controls from the legacy task toolbar grid.
    // Moving, rather than cloning, the existing filter details and search
    // input preserves the original listeners, values and ARIA relationships.
    const bar=document.createElement('div');
    bar.id='mobileTaskCompactBar';
    bar.setAttribute('role','group');
    bar.setAttribute('aria-label','Поиск, фильтры и отображение задач');
    toolbar.insertBefore(bar,toolbar.firstChild);
    const searchBtn=document.createElement('button');
    searchBtn.id='mobileTaskSearchBtn';searchBtn.type='button';
    searchBtn.className='mobile-task-control';
    searchBtn.setAttribute('aria-controls','taskSearch');
    searchBtn.setAttribute('aria-label','Поиск по задачам');
    searchBtn.setAttribute('aria-expanded','false');
    searchBtn.innerHTML=searchIcon;
    bar.appendChild(searchBtn);
    const view=createControl('mobileTaskView',
      '<button id="mobileTaskViewBtn" class="mobile-task-control" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="mobileTaskViewMenu">'+
      viewIcon+'<span class="mobile-task-view-label">Неделя</span><span class="mobile-task-chevron" aria-hidden="true">⌄</span></button>'+
      '<div id="mobileTaskViewMenu" class="mobile-task-view-menu" role="group" aria-label="Режим отображения">'+
      '<button type="button" data-mobile-task-mode="week" role="checkbox">Неделя</button>'+
      '<button type="button" data-mobile-task-mode="assignee" role="checkbox">Исполнители</button>'+
      '<button type="button" data-mobile-task-mode="status" role="checkbox">Статусы</button></div>');
    bar.appendChild(filter);
    bar.appendChild(view);
    const filterSummary=filter.querySelector('summary');
    if(filterSummary){
      filterSummary.innerHTML=funnel+'<span class="mobile-filter-indicator" aria-hidden="true"></span>';
      filterSummary.setAttribute('title','Фильтры задач');
      filterSummary.setAttribute('aria-label','Открыть фильтры задач');
    }
    const filterBody=filter.querySelector('.mobile-filter-body');
    // Preserve the original completed-toggle checkbox and its established handler.
    if(mq.matches&&filterBody&&done.parentElement!==filterBody)filterBody.appendChild(done);
    function syncPlacement(){
      const search=$('taskSearch');
      if(mq.matches){
        if(search&&search.parentElement!==bar)bar.insertBefore(search,searchBtn);
        if(filter.parentElement!==bar)bar.appendChild(filter);
        if(view.parentElement!==bar)bar.appendChild(view);
        if(filterBody&&done.parentElement!==filterBody)filterBody.appendChild(done);
      }else{
        if(search?.parentElement===bar)bar.insertAdjacentElement('afterend',search);
        if(done.parentElement===filterBody)toolbar.insertBefore(done,mode);
      }
      const open=bar.classList.contains('mobile-task-search-open')&&mq.matches;
      if(search){
        search.setAttribute('aria-hidden',String(mq.matches&&!open));
        search.tabIndex=mq.matches&&!open?-1:0;
      }
    }
    syncPlacement();
    searchBtn.addEventListener('click',()=>toggleSearch());
    $('mobileTaskViewBtn').addEventListener('click',()=>{
      if(!mq.matches)return;
      const opening=!view.classList.contains('open');
      view.classList.toggle('open',opening);
      $('mobileTaskViewBtn').setAttribute('aria-expanded',String(opening));
      if(opening)filter.removeAttribute('open');
    });
    $('mobileTaskViewMenu').addEventListener('click',e=>{
      const item=e.target.closest('[data-mobile-task-mode]');
      if(!item)return;
      // Use the existing handler to retain mode persistence and board re-render.
      mode.querySelector('[data-task-mode="'+item.dataset.mobileTaskMode+'"]')?.click();
      updateMode();closeMode();
    });
    filter.addEventListener('toggle',()=>{if(filter.open)closeMode();updateFilterState()});
    document.addEventListener('click',e=>{
      if(view.classList.contains('open')&&!e.target.closest('#mobileTaskView'))closeMode();
    });
    document.addEventListener('keydown',e=>{
      if(e.key!=='Escape')return;
      if(view.classList.contains('open')){closeMode();return}
      if(toolbar.classList.contains('mobile-task-search-open'))toggleSearch(false);
    });
    $('taskSearch')?.addEventListener('input',syncSearchState);
    toolbar.addEventListener('change',updateFilterState);
    toolbar.addEventListener('click',()=>{
      // The existing Done control updates checked state on the next render.
      window.setTimeout(updateFilterState,0);
    });
    // RenderTasks updates the active class without rebuilding the mode buttons.
    if(window.MutationObserver){
      observer=new MutationObserver(()=>{updateMode();updateFilterState()});
      observer.observe(mode,{subtree:true,attributes:true,attributeFilter:['class']});
    }
    mq.addEventListener?.('change',()=>{
      closeMode();toggleSearch(false);syncPlacement();updateFilterState();
    });
    updateMode();updateFilterState();syncSearchState();
    // The keyboard can focus the desktop search without it being visible on mobile.
    if(mq.matches&&!toolbar.classList.contains('mobile-task-search-open')){
      $('taskSearch')?.setAttribute('aria-hidden','true');
      if($('taskSearch'))$('taskSearch').tabIndex=-1;
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
  window.addEventListener('pt-task-controls-ready',install);
  window.ProjectTrackerMobileTaskToolbar={refresh:()=>{install();updateMode();updateFilterState()},toggleSearch};
})();
