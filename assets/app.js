(function(){
  if(window.__PT_LOADER__) return;
  window.__PT_LOADER__ = true;
  function s(src, cb){
    var x = document.createElement('script');
    x.src = src;
    x.async = false;
    if(cb) x.onload = cb;
    document.head.appendChild(x);
  }
  s('assets/app-runtime.js?v=20260520-calendar-timeline-v1', function(){
    s('assets/assignment-notifications.js?v=20260529-assignment-alerts-v3', function(){
      s('assets/task-comments.js?v=20260529-task-comments-v1');
      s('assets/mention-dropdown-v6.js?v=20260529-mention-dropdown-v6');
      s('assets/notification-polling-rescue-lite.js?v=20260529-notification-rescue-lite-v1');
    });
  });
})();
