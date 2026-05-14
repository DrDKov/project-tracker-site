/* Project Tracker PWA bootstrap. Loads the stable app runtime after installing PWA metadata. */
(function(){
  if(window.__PT_PWA_BOOTSTRAP__) return;
  window.__PT_PWA_BOOTSTRAP__ = true;

  var MOBILE_VIEWS = [
    { id: 'tasks', label: 'Задачи', icon: '✓' },
    { id: 'projects', label: 'Проекты', icon: '▦' },
    { id: 'team', label: 'Команда', icon: '◉' },
    { id: 'chat', label: 'Чаты', icon: '✎' },
    { id: 'settings', label: 'Настройки', icon: '⚙' }
  ];
  var HIDDEN_MOBILE_VIEWS = ['overview', 'timeline', 'audit'];

  function ensureLink(rel, href, attrs){
    var existing = document.querySelector('link[rel="'+rel+'"][href="'+href+'"]');
    if(existing) return existing;
    var el = document.createElement('link');
    el.rel = rel;
    el.href = href;
    if(attrs){ Object.keys(attrs).forEach(function(key){ el.setAttribute(key, attrs[key]); }); }
    document.head.appendChild(el);
    return el;
  }

  function ensureMeta(name, content){
    var existing = document.querySelector('meta[name="'+name+'"]');
    if(existing){ existing.setAttribute('content', content); return existing; }
    var el = document.createElement('meta');
    el.name = name;
    el.content = content;
    document.head.appendChild(el);
    return el;
  }

  function isPwaMobileMode(){
    var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    var mobile = window.innerWidth <= 768;
    return standalone && mobile;
  }

  function getActiveViewId(){
    var active = document.querySelector('.view.active');
    return active ? active.id : '';
  }

  function setActiveMobileNav(){
    var nav = document.getElementById('pwaMobileBottomNav');
    if(!nav) return;
    var activeId = getActiveViewId();
    nav.querySelectorAll('button[data-mobile-view]').forEach(function(btn){
      btn.classList.toggle('active', btn.getAttribute('data-mobile-view') === activeId);
    });
  }

  function activateViewFallback(viewId){
    document.querySelectorAll('.view').forEach(function(view){
      view.classList.toggle('active', view.id === viewId);
    });
    document.querySelectorAll('.nav button[data-view]').forEach(function(btn){
      btn.classList.toggle('active', btn.getAttribute('data-view') === viewId);
    });
    var title = document.getElementById('pageTitle');
    var selected = MOBILE_VIEWS.find(function(item){ return item.id === viewId; });
    if(title && selected) title.textContent = selected.label;
    setActiveMobileNav();
  }

  function goMobileView(viewId){
    var desktopButton = document.querySelector('.nav button[data-view="'+viewId+'"]');
    if(desktopButton) desktopButton.click();
    setTimeout(function(){
      if(getActiveViewId() !== viewId) activateViewFallback(viewId);
      setActiveMobileNav();
    }, 0);
  }

  function enforceMobileViewSet(){
    if(!document.body || !document.body.classList.contains('pwa-mobile-mode')) return;
    var activeId = getActiveViewId();
    if(!activeId || HIDDEN_MOBILE_VIEWS.indexOf(activeId) !== -1){
      goMobileView('tasks');
      return;
    }
    setActiveMobileNav();
  }

  function renderMobileBottomNav(){
    var existing = document.getElementById('pwaMobileBottomNav');
    if(!document.body || !document.body.classList.contains('pwa-mobile-mode')){
      if(existing) existing.remove();
      return;
    }
    if(!existing){
      existing = document.createElement('nav');
      existing.id = 'pwaMobileBottomNav';
      existing.className = 'pwa-mobile-bottom-nav';
      existing.setAttribute('aria-label', 'Мобильная навигация');
      existing.innerHTML = MOBILE_VIEWS.map(function(item){
        return '<button type="button" data-mobile-view="'+item.id+'"><span class="pwa-mobile-nav-icon">'+item.icon+'</span><span>'+item.label+'</span></button>';
      }).join('');
      existing.addEventListener('click', function(event){
        var button = event.target.closest('button[data-mobile-view]');
        if(!button) return;
        event.preventDefault();
        goMobileView(button.getAttribute('data-mobile-view'));
      });
      document.body.appendChild(existing);
    }
    enforceMobileViewSet();
    setActiveMobileNav();
  }

  window.renderMobileBottomNav = renderMobileBottomNav;

  function applyPwaMobileMode(){
    if(!document.body) return;
    document.body.classList.toggle('pwa-mobile-mode', isPwaMobileMode());
    renderMobileBottomNav();
  }

  ensureLink('manifest', 'manifest.webmanifest');
  ensureMeta('theme-color', '#2563eb');
  ensureMeta('apple-mobile-web-app-capable', 'yes');
  ensureMeta('apple-mobile-web-app-status-bar-style', 'default');
  ensureMeta('apple-mobile-web-app-title', 'Project Tracker');
  ensureLink('apple-touch-icon', 'assets/icons/icon-192.png');

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyPwaMobileMode, { once: true });
  else applyPwaMobileMode();
  window.addEventListener('resize', applyPwaMobileMode);
  window.addEventListener('orientationchange', applyPwaMobileMode);

  var viewObserver = new MutationObserver(function(){
    renderMobileBottomNav();
  });
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      viewObserver.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
    }, { once: true });
  } else if(document.body){
    viewObserver.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  if('serviceWorker' in navigator){
    window.addEventListener('load', function(){
      applyPwaMobileMode();
      navigator.serviceWorker.register('service-worker.js').catch(function(err){ console.warn('Service worker registration failed', err); });
    });
  }

  var runtime = document.createElement('script');
  runtime.src = 'https://cdn.jsdelivr.net/gh/DrDKov/project-tracker-site@805be0b49a87b3f4d007f3d0de47340580369319/assets/app.js';
  runtime.async = false;
  runtime.onload = function(){
    setTimeout(function(){ applyPwaMobileMode(); enforceMobileViewSet(); }, 0);
  };
  runtime.onerror = function(){
    console.error('Project Tracker runtime failed to load');
    var status = document.getElementById('sideStatusText');
    if(status) status.textContent = 'Не удалось загрузить основной runtime приложения.';
  };
  document.head.appendChild(runtime);
})();
