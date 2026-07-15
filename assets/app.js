(function(){
  if(window.__PT_LOADER_IMPORT__) return;
  window.__PT_LOADER_IMPORT__ = true;
  import('./app-runtime.js?v=20260715-push-v3')
    .then(function(){
      var modules = [
        './materials-v2.js?v=20260715-push-v3',
        './assignment-notifications.js?v=20260715-push-v3',
        './task-comments.js?v=20260715-push-v3',
        './mention-dropdown-v6.js?v=20260715-push-v3',
        './notification-polling-rescue-lite.js?v=20260715-push-v3'
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