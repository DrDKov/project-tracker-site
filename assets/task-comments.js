/* Keeps the task comment panel scoped to the task currently opened in the modal. */
(function(){
  if(window.__TASK_COMMENTS_STATE_FIX_V1__) return;
  window.__TASK_COMMENTS_STATE_FIX_V1__ = 1;

  function $(id){ return document.getElementById(id); }

  function syncCommentState(){
    var taskId = String($('taskId') && $('taskId').value || '').trim();
    var list = $('taskCommentsList');
    var count = $('taskCommentsCount');
    var text = $('taskCommentText');
    var send = document.querySelector('#taskCommentsBlock [data-action="add-task-comment"]');

    if(taskId){
      if(text) text.disabled = false;
      if(send) send.disabled = false;
      return;
    }

    if(text){
      text.value = '';
      text.disabled = true;
    }
    if(send) send.disabled = true;
    if(count) count.textContent = '0';
    if(list) list.innerHTML = '<div class="empty">Сохраните задачу, чтобы добавить комментарии.</div>';
  }

  function bind(){
    var modal = $('taskModal');
    if(!modal){
      setTimeout(bind,100);
      return;
    }

    new MutationObserver(function(records){
      if(records.some(function(record){ return record.attributeName === 'open'; })) syncCommentState();
    }).observe(modal,{attributes:true,attributeFilter:['open']});

    document.addEventListener('click',function(event){
      var target = event.target.closest('#quickTaskBtn,#newTaskBtn,[data-action="new-task"],.week-add-task-btn,[data-action="new-task-on-date"],[data-action="tl-add-day"]');
      if(target) setTimeout(syncCommentState);
    },true);

    syncCommentState();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();