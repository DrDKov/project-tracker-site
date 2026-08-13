(function(){
  if(window.__PT_LOADER_IMPORT__) return;
  window.__PT_LOADER_IMPORT__ = true;
  import('./app-runtime.js?v=20260813-actions-v2')
    .then(function(){
      var modules = [
        './theme-settings.js?v=20260812-neo-skeuo-v1',
        './materials-v2.js?v=20260715-unread-v1',
        './assignment-notifications.js?v=20260715-unread-v1',
        './task-comments.js?v=20260717-comments-v3',
        './mobile-completed-tasks-toggle.js?v=20260722-completed-v1',
        './subtask-reorder.js?v=20260728-task-comment-composer-v1',
        './mention-dropdown-v6.js?v=20260715-unread-v1',
        './notification-polling-rescue-lite.js?v=20260715-unread-v1'
      ];
      return Promise.allSettled(modules.map(function(path){ return import(path); }));
    })
    .then(function(results){
      results.forEach(function(result,index){
        if(result.status === 'rejected') console.error('Workspace optional module failed',index,result.reason);
      });
    })
    .catch(function(err){ console.error('Workspace runtime failed', err); });
})();
