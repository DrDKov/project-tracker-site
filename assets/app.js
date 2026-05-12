/* App loader v135: keep canonical app code untouched and load current week-day task plus helper. */
(()=>{
  if(window.__PROJECT_TRACKER_APP_LOADER_V135__) return;
  window.__PROJECT_TRACKER_APP_LOADER_V135__ = 1;
  const appUrl = 'https://cdn.jsdelivr.net/gh/DrDKov/project-tracker-site@e481d7309e43a8dd83b8325a0b1a24cfde86b06b/assets/app.js';
  const helperUrl = 'assets/week-day-task-plus-v133.js?v=20260512-v135';
  function load(src, cb){
    const s = document.createElement('script');
    s.src = src;
    s.onload = cb || null;
    document.head.appendChild(s);
  }
  load(appUrl, ()=>load(helperUrl));
})();
