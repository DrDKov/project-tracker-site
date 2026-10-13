/* Tablet Tasks toolbar: a single adaptive line, with the real filters and week navigation. */
(function(){
  'use strict';
  if(window.__PT_TABLET_TASK_TOOLBAR_V1__)return;
  window.__PT_TABLET_TASK_TOOLBAR_V1__=true;
  const tablet=window.matchMedia('(min-width:981px) and (max-width:1366px)');
  const phone=window.matchMedia('(max-width:980px)');
  const $=id=>document.getElementById(id);
  const icon=paths=>'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths+'</svg>';
  const searchIcon=icon('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>');
  const closeIcon=icon('<path d="M18 6 6 18M6 6l12 12"/>');
  const viewIcon=icon('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M10 10v10"/>');
  const modes={status:'По статусам',assignee:'По исполнителям',week:'По неделе'};
  let installed=false,scheduled=false,attempts=0;

  function currentMode(){
    return document.querySelector('#taskBoardModeToggle [data-task-mode].active')?.dataset.taskMode||'status';
  }
  function move(node,parent,before=null){
    if(!node||!parent)return;
    if(node.parentElement!==parent||(before&&node.nextElementSibling!==before))parent.insertBefore(node,before);
  }
  function filterParts(){
    return [$('taskProjectFilter')?.__msWrap,$('taskAssigneeFilter')?.__msWrap,$('taskShowDoneWrap'),$('taskDateFilter')];
  }
  function closedMenu(){
    const wrap=$('tabletTaskView');
    if(!wrap)return;
    wrap.classList.remove('open');
    $('tabletTaskViewBtn')?.setAttribute('aria-expanded','false');
  }
  function closeSearch(){
    const bar=$('tabletTaskBar');
    if(!bar)return;
    bar.classList.remove('tablet-search-open');
    const button=$('tabletTaskSearchBtn');
    if(button){button.innerHTML=searchIcon;button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Поиск задач');}
  }
  function toggleSearch(){
    const bar=$('tabletTaskBar'),input=$('taskSearch'),button=$('tabletTaskSearchBtn');
    if(!bar||!input||!button)return;
    const open=bar.classList.toggle('tablet-search-open');
    button.innerHTML=open?closeIcon:searchIcon;
    button.setAttribute('aria-label',open?'Закрыть поиск':'Поиск задач');
    button.setAttribute('aria-expanded',String(open));
    closedMenu();
    $('mobileTaskFilters')?.removeAttribute('open');
    if(open){try{input.focus({preventScroll:true})}catch(_err){input.focus()}}
  }
  function reflect(){
    const mode=currentMode(),button=$('tabletTaskViewBtn'),week=$('taskWeekNav');
    if(button){
      const label=button.querySelector('.tablet-task-mode-label');
      if(label)label.textContent=modes[mode]||modes.status;
      button.setAttribute('aria-label','Представление задач: '+(modes[mode]||modes.status));
    }
    document.querySelectorAll('#tabletTaskViewMenu [data-tablet-task-mode]').forEach(item=>{
      const selected=item.dataset.tabletTaskMode===mode;
      item.classList.toggle('selected',selected);
      item.setAttribute('aria-checked',String(selected));
    });
    if(week)week.classList.toggle('tablet-week-active',mode==='week');
    const date=$('tabletWeekNativeDate');
    if(date){
      date.disabled=mode!=='week';
      if(mode==='week'&&document.activeElement!==date){
        const dates=[...document.querySelectorAll('#kanban>.week-col[data-date]')].map(node=>node.dataset.date).filter(value=>/^\d{4}-\d{2}-\d{2}$/.test(value||''));
        if(dates.length){
          const today=new Date(),local=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
          if(!dates.includes(date.value))date.value=dates.includes(local)?local:dates[0];
        }
      }
    }
  }
  function prepareDate(week){
    if(!week||week.querySelector('#tabletWeekNativeDate'))return;
    const label=$('taskWeekLabel');
    if(!label)return;
    const wrap=document.createElement('span');
    wrap.className='tablet-week-date';
    label.parentNode.insertBefore(wrap,label);
    wrap.appendChild(label);
    const input=document.createElement('input');
    input.id='tabletWeekNativeDate';input.type='date';
    input.className='tablet-week-native-date';
    input.setAttribute('aria-label','Выбрать дату в календаре');
    input.setAttribute('title','Выбрать дату');
    wrap.appendChild(input);
    input.addEventListener('change',()=>{
      if(/^\d{4}-\d{2}-\d{2}$/.test(input.value||'')){
        document.dispatchEvent(new CustomEvent('pt-select-task-date',{detail:{date:input.value}}));
      }
    });
  }
  function ensure(){
    const toolbar=document.querySelector('#tasks>.toolbar');
    if(!toolbar||!$('taskWeekNav')||!$('taskBoardModeToggle')||!$('mobileTaskFilters')||!$('mobileTaskCompactBar')||!$('taskShowDoneWrap')){
      if(attempts++<100)setTimeout(ensure,100);
      return false;
    }
    if(installed)return true;
    installed=true;
    const bar=document.createElement('div');
    bar.id='tabletTaskBar';bar.setAttribute('role','group');
    bar.setAttribute('aria-label','Поиск, фильтры, представления и навигация задач');
    toolbar.insertBefore(bar,toolbar.firstChild);

    const search=document.createElement('button');
    search.type='button';search.id='tabletTaskSearchBtn';search.className='tablet-task-icon';
    search.setAttribute('aria-label','Поиск задач');search.setAttribute('aria-controls','taskSearch');
    search.setAttribute('aria-expanded','false');search.innerHTML=searchIcon;
    search.addEventListener('click',toggleSearch);bar.appendChild(search);

    const mode=document.createElement('div');mode.id='tabletTaskView';
    mode.innerHTML='<button id="tabletTaskViewBtn" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="tabletTaskViewMenu">'+
      viewIcon+'<span class="tablet-task-mode-label">По статусам</span><span class="tablet-mode-chevron" aria-hidden="true">⌄</span></button>'+
      '<div id="tabletTaskViewMenu" role="group" aria-label="Вид задач">'+
      '<button type="button" data-tablet-task-mode="status" role="checkbox">По статусам</button>'+
      '<button type="button" data-tablet-task-mode="assignee" role="checkbox">По исполнителям</button>'+
      '<button type="button" data-tablet-task-mode="week" role="checkbox">По неделе</button></div>';
    bar.appendChild(mode);
    $('tabletTaskViewBtn').addEventListener('click',()=>{
      if(!tablet.matches)return;
      const open=!mode.classList.contains('open');
      mode.classList.toggle('open',open);
      $('tabletTaskViewBtn').setAttribute('aria-expanded',String(open));
      if(open)$('mobileTaskFilters')?.removeAttribute('open');
    });
    $('tabletTaskViewMenu').addEventListener('click',event=>{
      const choice=event.target.closest('[data-tablet-task-mode]');
      if(!choice)return;
      $('taskBoardModeToggle')?.querySelector('[data-task-mode="'+choice.dataset.tabletTaskMode+'"]')?.click();
      closedMenu();schedule();
    });
    document.addEventListener('click',event=>{
      if(!tablet.matches)return;
      if(!event.target.closest('#tabletTaskView'))closedMenu();
      if(event.target.closest('#mobileTaskFilters'))return;
      if($('mobileTaskFilters')?.open)$('mobileTaskFilters').removeAttribute('open');
    });
    document.addEventListener('keydown',event=>{
      if(!tablet.matches||event.key!=='Escape')return;
      closedMenu();closeSearch();$('mobileTaskFilters')?.removeAttribute('open');
    });
    $('mobileTaskFilters').addEventListener('toggle',()=>{
      if(tablet.matches&&$('mobileTaskFilters').open)closedMenu();
    });
    $('taskSearch')?.addEventListener('input',()=>{
      search.classList.toggle('has-search',!!$('taskSearch')?.value?.trim());
    });
    $('taskBoardModeToggle')&&new MutationObserver(reflect).observe($('taskBoardModeToggle'),{subtree:true,attributes:true,attributeFilter:['class']});
    const week=$('taskWeekLabel');
    if(week)new MutationObserver(reflect).observe(week,{childList:true,characterData:true,subtree:true});
    return true;
  }
  function arrange(){
    if(!ensure())return;
    const bar=$('tabletTaskBar'),filter=$('mobileTaskFilters'),body=filter?.querySelector('.mobile-filter-body');
    const week=$('taskWeekNav'),toolbar=document.querySelector('#tasks>.toolbar');
    if(!bar||!body||!week||!toolbar)return;
    if(tablet.matches){
      move($('taskSearch'),bar,$('tabletTaskView'));
      move(filter,bar,$('tabletTaskView'));
      move(week,bar);
      prepareDate(week);
      filterParts().forEach(el=>move(el,body,$('mobileUndatedTasksBtn')));
      move($('openPlanningBtn'),body);
      bar.classList.add('tablet-task-enabled');
      reflect();
      $('tabletTaskSearchBtn')?.classList.toggle('has-search',!!$('taskSearch')?.value?.trim());
      return;
    }
    // Restore original nodes rather than cloning: all native handlers persist.
    closedMenu();closeSearch();filter?.removeAttribute('open');
    bar.classList.remove('tablet-task-enabled');
    const mobile=$('mobileTaskCompactBar');
    if(phone.matches){
      move($('taskSearch'),mobile,$('mobileTaskSearchBtn'));
      move(filter,mobile,$('mobileTaskView'));
      move(week,toolbar,$('newTaskBtn'));
      move($('openPlanningBtn'),toolbar,$('newTaskBtn'));
      // On phones the original filter drawer owns its controls.
      filterParts().forEach(el=>move(el,body,$('mobileUndatedTasksBtn')));
    }else{
      move($('taskSearch'),toolbar,bar);
      move(filter,mobile,$('mobileTaskView'));
      move(week,toolbar,$('newTaskBtn'));
      const mode=$('taskBoardModeToggle')||$('newTaskBtn');
      const plan=$('openPlanningBtn');move(plan,toolbar,mode);
      filterParts().forEach(el=>move(el,toolbar,mode));
    }
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;arrange()});
  }
  const boot=()=>{ensure();schedule()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  tablet.addEventListener?.('change',schedule);
  phone.addEventListener?.('change',schedule);
  window.addEventListener('pt-task-controls-ready',schedule);
  window.addEventListener('workspace-layout-change',schedule);
})();
