/* Task loading feedback lives outside the board to avoid changing task-column layout. */
(function(){
  'use strict';
  if(window.ProjectTrackerTaskLoadToast)return;
  const DELAY_MS=700;
  const state={token:0,timer:null,phase:'idle'};
  let toast=null;
  function ensureToast(){
    if(toast&&toast.isConnected)return toast;
    toast=document.createElement('div');
    toast.id='pt-task-load-toast';
    toast.className='pt-task-load-toast';
    toast.hidden=true;
    toast.setAttribute('role','status');
    toast.setAttribute('aria-live','polite');
    toast.setAttribute('aria-atomic','true');
    toast.innerHTML='<span class="pt-task-load-spinner" aria-hidden="true"></span><div class="pt-task-load-copy"><strong class="pt-task-load-title"></strong><span class="pt-task-load-description"></span></div><button type="button" class="pt-task-load-close" aria-label="Скрыть уведомление о загрузке" title="Скрыть">×</button>';
    toast.querySelector('.pt-task-load-close').addEventListener('click',finish);
    document.body.appendChild(toast);
    return toast;
  }
  function display(phase){
    const el=ensureToast();
    el.dataset.phase=phase;
    const title=el.querySelector('.pt-task-load-title');
    const description=el.querySelector('.pt-task-load-description');
    if(phase==='retry'){
      title.textContent='Повторяем загрузку задач…';
      description.textContent='Соединение отвечает медленно. Пробуем ещё раз.';
    }else if(phase==='error'){
      title.textContent='Не удалось обновить задачи';
      description.textContent='Проверьте соединение и нажмите «Обновить».';
    }else{
      title.textContent='Загружаем задачи…';
      description.textContent='Синхронизируем данные Workspace.';
    }
    el.hidden=false;
  }
  function hide(){if(toast)toast.hidden=true;}
  function clearTimer(){if(state.timer!==null){clearTimeout(state.timer);state.timer=null;}}
  function begin(){
    clearTimer();
    const token=++state.token;
    state.phase='loading';hide();
    state.timer=setTimeout(()=>{
      state.timer=null;
      if(state.token===token&&(state.phase==='loading'||state.phase==='retry'))display(state.phase);
    },DELAY_MS);
  }
  function retry(){
    if(state.phase!=='loading'&&state.phase!=='retry')return;
    state.phase='retry';
    if(toast&&!toast.hidden)display('retry');
  }
  function finish(){++state.token;clearTimer();state.phase='idle';hide();}
  function fail(){++state.token;clearTimer();state.phase='error';display('error');}
  window.ProjectTrackerTaskLoadToast={begin,retry,finish,fail,clear:finish};
})();
