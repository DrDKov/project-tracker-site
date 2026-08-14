(function(){
  if(window.__NATIVE_PICKERS_V1__) return;
  window.__NATIVE_PICKERS_V1__ = true;

  var selector = "dialog.modal input.input[type='date'],dialog.modal input.input[type='time']";

  function fieldLabel(input){
    var label = input.closest('label');
    var title = label && label.querySelector(':scope > span');
    return title ? title.textContent.trim() : '';
  }

  function buttonLabel(input){
    var kind = input.type === 'time' ? 'выбор времени' : 'календарь';
    var title = fieldLabel(input);
    return 'Открыть ' + kind + (title ? ': ' + title : '');
  }

  function sync(input){
    var button = input.closest('.native-picker-field')?.querySelector('.native-picker-trigger');
    if(!button) return;
    button.disabled = input.disabled || input.readOnly;
    button.setAttribute('aria-label', buttonLabel(input));
    button.title = buttonLabel(input);
  }

  function openPicker(input){
    if(!input || input.disabled || input.readOnly) return;
    try{ input.focus({preventScroll:true}); }catch(_err){ input.focus(); }
    if(typeof input.showPicker === 'function'){
      try{
        input.showPicker();
        return;
      }catch(_err){}
    }
    try{ input.click(); }catch(_err){}
  }

  function enhance(input){
    if(!input || input.dataset.nativePickerReady === '1'){
      if(input) sync(input);
      return;
    }
    input.dataset.nativePickerReady = '1';

    var wrapper = document.createElement('span');
    wrapper.className = 'native-picker-field';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'native-picker-trigger';
    button.dataset.pickerType = input.type;
    button.addEventListener('click', function(event){
      event.preventDefault();
      event.stopPropagation();
      openPicker(input);
    });
    wrapper.appendChild(button);
    sync(input);
  }

  function scan(root){
    if(root && root.matches && root.matches(selector)) enhance(root);
    if(root && root.querySelectorAll) root.querySelectorAll(selector).forEach(enhance);
  }

  function boot(){
    scan(document);
    new MutationObserver(function(records){
      records.forEach(function(record){
        if(record.type === 'attributes'){
          if(record.target.matches && record.target.matches(selector)) sync(record.target);
          return;
        }
        record.addedNodes.forEach(scan);
      });
    }).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','readonly']});
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
