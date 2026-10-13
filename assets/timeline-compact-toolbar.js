/* Timeline compact controls: search on demand, all filters in one funnel. */
(function(){
  'use strict';
  if(window.__PT_TIMELINE_CONTROLS_V1__)return;
  window.__PT_TIMELINE_CONTROLS_V1__=true;
  const $=id=>document.getElementById(id);
  const svg=paths=>'<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths+'</svg>';
  const search=svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>');
  const close=svg('<path d="M18 6 6 18M6 6l12 12"/>');
  const filter=svg('<path d="M4 5h16l-6.5 7.5V19l-3 1v-7.5z"/>');
  let searchOpen=false,filtersOpen=false,queryFocused=false,caret=null,scheduled=false;
  const filterIds=['tlP','tlU','tlS','tlR'];
  const labels={tlP:'Проект',tlU:'Исполнитель',tlS:'Статус',tlR:'Приоритет'};
  function activeFilter(){
    return filterIds.some(id=>{const node=$(id);return node&&node.value!=='all'})||!!$('tlDone')?.checked;
  }
  function sync(toolbar){
    if(!toolbar)return;
    toolbar.classList.toggle('tl-search-open',searchOpen);
    toolbar.classList.toggle('tl-filters-open',filtersOpen);
    const searchButton=$('tlCompactSearch');
    if(searchButton){
      const iconState=searchOpen?'close':'search';
      if(searchButton.dataset.iconState!==iconState){searchButton.innerHTML=searchOpen?close:search;searchButton.dataset.iconState=iconState;}
      searchButton.setAttribute('aria-label',searchOpen?'Закрыть поиск по таймлайну':'Поиск по таймлайну');
      searchButton.setAttribute('aria-expanded',String(searchOpen));
      searchButton.classList.toggle('has-search',!!$('tlQ')?.value?.trim());
    }
    const filterButton=$('tlCompactFilters');
    if(filterButton){
      filterButton.setAttribute('aria-expanded',String(filtersOpen));
      filterButton.setAttribute('aria-label',activeFilter()?'Фильтры таймлайна: активны':'Фильтры таймлайна');
      filterButton.classList.toggle('has-filters',activeFilter());
    }
    const panel=$('tlCompactFilterPanel');
    if(panel)panel.hidden=!filtersOpen;
    if($('tlQ'))$('tlQ').tabIndex=searchOpen?0:-1;
  }
  function apply(){
    const toolbar=document.querySelector('#timeline .timeline-calendar-toolbar');
    if(!toolbar)return;
    if(toolbar.dataset.compactTimelineReady==='1'){sync(toolbar);return;}
    const query=$('tlQ');
    if(!query)return;
    toolbar.dataset.compactTimelineReady='1';
    toolbar.classList.add('tl-compact-toolbar');
    const searchButton=document.createElement('button');
    searchButton.type='button';searchButton.id='tlCompactSearch';
    searchButton.className='tl-compact-button';searchButton.setAttribute('aria-controls','tlQ');
    toolbar.insertBefore(searchButton,toolbar.firstChild);
    const filterButton=document.createElement('button');
    filterButton.type='button';filterButton.id='tlCompactFilters';
    filterButton.className='tl-compact-button';filterButton.setAttribute('aria-haspopup','true');
    filterButton.setAttribute('aria-controls','tlCompactFilterPanel');
    searchButton.insertAdjacentElement('afterend',filterButton);
    const panel=document.createElement('div');
    panel.id='tlCompactFilterPanel';panel.className='tl-compact-panel';
    panel.setAttribute('role','group');panel.setAttribute('aria-label','Фильтры таймлайна');
    panel.innerHTML='<div class="tl-compact-panel-head"><strong>Фильтры</strong><button type="button" class="tl-compact-dismiss" data-tl-compact-close aria-label="Закрыть фильтры">×</button></div><div class="tl-compact-fields"></div><button type="button" class="tl-compact-reset" data-tl-compact-reset>Сбросить фильтры</button>';
    toolbar.appendChild(panel);
    const body=panel.querySelector('.tl-compact-fields');
    for(const id of filterIds){
      const item=$(id);if(!item)continue;
      const wrap=document.createElement('label');
      wrap.className='tl-compact-field';
      const title=document.createElement('span');
      title.textContent=labels[id];wrap.appendChild(title);wrap.appendChild(item);
      body.appendChild(wrap);
    }
    const done=$('tlDone');
    if(done){
      const checked=done.closest('.tl-check');
      if(checked){checked.classList.add('tl-compact-completed');body.appendChild(checked);}
    }
    searchButton.addEventListener('click',()=>{
      searchOpen=!searchOpen;
      if(searchOpen)filtersOpen=false;
      else queryFocused=false;
      sync(toolbar);
      if(searchOpen){queryFocused=true;query.focus({preventScroll:true});}
      else query.blur();
    });
    filterButton.addEventListener('click',()=>{
      filtersOpen=!filtersOpen;
      if(filtersOpen){searchOpen=false;queryFocused=false;query.blur();}
      sync(toolbar);
    });
    panel.querySelector('[data-tl-compact-close]').addEventListener('click',()=>{
      filtersOpen=false;sync(toolbar);filterButton.focus({preventScroll:true});
    });
    panel.querySelector('[data-tl-compact-reset]').addEventListener('click',()=>{
      filterIds.forEach(id=>{const el=$(id);if(el)el.value='all'});
      if($('tlDone'))$('tlDone').checked=false;
      const target=$('tlDone')||$('tlP');
      if(target)target.dispatchEvent(new Event('change',{bubbles:true}));
      else sync(toolbar);
    });
    sync(toolbar);
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;apply()});
  }
  function beforeSearchRender(field){
    queryFocused=!!field&&field===document.activeElement;
    caret=field&&typeof field.selectionStart==='number'?field.selectionStart:null;
  }
  function afterSearchRender(){
    apply();
    if(searchOpen&&queryFocused){
      const input=$('tlQ');
      if(input){
        try{input.focus({preventScroll:true})}catch(_err){input.focus()}
        if(caret!==null)try{input.setSelectionRange(caret,caret)}catch(_err){}
      }
    }
  }
  document.addEventListener('click',event=>{
    const toolbar=document.querySelector('#timeline .timeline-calendar-toolbar');
    if(!toolbar)return;
    if(filtersOpen&&!event.target.closest('#tlCompactFilterPanel,#tlCompactFilters')){
      filtersOpen=false;sync(toolbar);
    }
  });
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    const bar=document.querySelector('#timeline .timeline-calendar-toolbar');
    if(!bar)return;
    if(filtersOpen){filtersOpen=false;sync(bar);$('tlCompactFilters')?.focus({preventScroll:true});}
    else if(searchOpen){searchOpen=false;queryFocused=false;sync(bar);$('tlCompactSearch')?.focus({preventScroll:true});}
  });
  const initialize=()=>{
    const root=$('timeline');if(!root)return;
    if(typeof MutationObserver==='function')new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
    apply();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
  window.ProjectTrackerTimelineToolbar={beforeSearchRender,afterSearchRender,refresh:schedule};
})();