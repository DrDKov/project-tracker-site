(function(){
  if(window.__PT_LOADER_IMPORT__) return;
  window.__PT_LOADER_IMPORT__ = true;
  Promise.resolve()
    .then(function(){ return import('./app-runtime.js?v=20260520-calendar-timeline-v1'); })
    .then(function(){ return import('./materials-v2.js?v=20260529-materials-v4'); })
    .then(function(){ return import('./assignment-notifications.js?v=20260529-assignment-alerts-v3'); })
    .then(function(){ return import('./task-comments.js?v=20260529-task-comments-v1'); })
    .then(function(){ return import('./mention-dropdown-v6.js?v=20260529-mention-dropdown-v6'); })
    .then(function(){ return import('./notification-polling-rescue-lite.js?v=20260529-notification-rescue-lite-v1'); })
    .catch(function(err){ console.error('Workspace loader failed', err); });
})();
