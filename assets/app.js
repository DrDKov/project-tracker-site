/* Stable loader: disables unstable checkbox-filter enhancer, loads canonical runtime, then enables safe dropdown filters. */
(function(){
  window.__CHECKBOX_FILTERS_V93__ = 1;
  document.write('<script src="assets/app-runtime.js?v=stable-v90"><\/script>');

  var FILTER_IDS = ['projectStatusFilter','projectOwnerFilter','taskProjectFilter','taskAssigneeFilter'];

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
    if(!selectedValues(select).length) setSelectedValues(select,['all']);

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
    FILTER_IDS.forEach(function(id){ enhanceFilter(document.getElementById(id)); });
  }

  function scheduleEnhance(){
    [0,200,800,1600].forEach(function(delay){ setTimeout(enhanceAllFilters,delay); });
  }

  document.addEventListener('click',function(event){
    if(!event.target.closest('.ms-filter')) document.querySelectorAll('.ms-filter.open').forEach(function(item){ item.classList.remove('open'); });
    if(event.target.closest('.nav button[data-view], #refreshBtn')) scheduleEnhance();
  },true);

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',scheduleEnhance,{once:true});
  else scheduleEnhance();
  window.addEventListener('load',scheduleEnhance,{once:true});
})();
