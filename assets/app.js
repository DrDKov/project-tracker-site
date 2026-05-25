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
