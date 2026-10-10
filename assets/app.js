(function(){
  if(window.__PT_LOADER_IMPORT__) return;
  window.__PT_LOADER_IMPORT__ = true;
  import('./app-runtime.js?v=20261010-lazy-data-v2')
    .then(function(){
      var modules = [
        './workspace-layout.js?v=20261002-compact-v2',
        './workspace-announcements.js?v=20261001-announcements-v1',
        './theme-settings.js?v=20260824-event-scope-v1',
        './materials-v2.js?v=20261001-subtask-actions-v2',
        // Notifications are loaded once by index.html, including their fallback polling.
        './task-comments.js?v=20260717-comments-v3',
        './native-pickers.js?v=20260814-native-pickers-v1',
        './mobile-completed-tasks-toggle.js?v=20261002-compact-v2',
        './subtask-reorder.js?v=20260728-task-comment-composer-v1',
        './mention-dropdown-v6.js?v=20260715-unread-v1',

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
