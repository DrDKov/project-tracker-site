(function(){
  'use strict';

  if(window.__MOBILE_COMPLETED_TASKS_TOGGLE_V1__) return;
  window.__MOBILE_COMPLETED_TASKS_TOGGLE_V1__ = true;

  var mq = window.matchMedia
    ? window.matchMedia('(max-width:980px)')
    : { matches: false, addEventListener: function(){} };
  var observer = null;
  var retryTimer = 0;
  var framePending = false;

  function ensureStyles(){
    if(document.getElementById('mobile-completed-tasks-toggle-v1')) return;
    var style = document.createElement('style');
    style.id = 'mobile-completed-tasks-toggle-v1';
    style.textContent = [
      '@media(max-width:980px){',
      'body #tasks>.toolbar>#taskShowDoneWrap.mobile-completed-visible{',
      'grid-column:1/-1!important;width:100%!important;margin:0!important;cursor:pointer!important;',
      '}',
      'body #tasks>.toolbar>#taskShowDoneWrap.mobile-completed-visible>span{',
      'order:-1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
      '}',
      '}'
    ].join('');
    (document.head || document.documentElement).appendChild(style);
  }

  function schedule(){
    if(framePending) return;
    framePending = true;
    var run = window.requestAnimationFrame || function(callback){ return setTimeout(callback, 0); };
    run(function(){
      framePending = false;
      placeToggle();
    });
  }

  function setText(node, value){
    if(node && node.textContent !== value) node.textContent = value;
  }

  function setAttribute(node, name, value){
    if(node && node.getAttribute(name) !== value) node.setAttribute(name, value);
  }

  function placeToggle(){
    var toolbar = document.querySelector('#tasks>.toolbar');
    var modeToggle = document.getElementById('taskBoardModeToggle');
    var doneToggle = document.getElementById('taskShowDoneWrap');

    if(!toolbar || !modeToggle || !doneToggle){
      clearTimeout(retryTimer);
      retryTimer = setTimeout(placeToggle, 100);
      return;
    }

    ensureStyles();
    var label = doneToggle.querySelector('span');
    var checkbox = doneToggle.querySelector('input');

    if(mq.matches){
      doneToggle.classList.add('mobile-completed-visible');
      setText(label, 'Показывать завершённые');
      setAttribute(doneToggle, 'title', 'Показывать завершённые задачи');
      setAttribute(checkbox, 'aria-label', 'Показывать завершённые задачи');
      if(doneToggle.parentElement !== toolbar || modeToggle.nextElementSibling !== doneToggle){
        modeToggle.insertAdjacentElement('afterend', doneToggle);
      }
    }else{
      doneToggle.classList.remove('mobile-completed-visible');
      setText(label, 'Выполненные');
      if(doneToggle.parentElement !== toolbar || doneToggle.nextElementSibling !== modeToggle){
        toolbar.insertBefore(doneToggle, modeToggle);
      }
    }

    if(!observer && window.MutationObserver){
      observer = new MutationObserver(schedule);
      observer.observe(toolbar, { childList: true, subtree: true });
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', placeToggle, { once: true });
  }else{
    placeToggle();
  }
  if(mq.addEventListener) mq.addEventListener('change', schedule);
  else if(mq.addListener) mq.addListener(schedule);
})();

