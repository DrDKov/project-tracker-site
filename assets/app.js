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
  var mobileDayState = { ymd: toYmd(new Date()) };

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

  function pad(n){ return String(n).padStart(2, '0'); }
  function toYmd(date){ return date.getFullYear() + '-' + pad(date.getMonth()+1) + '-' + pad(date.getDate()); }
  function fromYmd(value){ var d = new Date(String(value) + 'T00:00:00'); return isNaN(d.getTime()) ? new Date() : d; }
  function addDays(value, delta){ var d = fromYmd(value); d.setDate(d.getDate() + delta); return toYmd(d); }
  function ruDayLabel(value){
    var d = fromYmd(value);
    var days = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
    return days[d.getDay()] + ', ' + pad(d.getDate()) + '.' + pad(d.getMonth()+1);
  }
  function parseDateFromText(text){
    var match = String(text || '').match(/(\d{1,2})[.,]\s*(\d{1,2})/);
    if(!match) return '';
    var now = new Date();
    var day = Number(match[1]);
    var month = Number(match[2]) - 1;
    if(!day || month < 0) return '';
    return toYmd(new Date(now.getFullYear(), month, day));
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
      applyMobileWeekDayMode();
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

  function getWeekColumns(){
    return Array.prototype.slice.call(document.querySelectorAll('#tasks .week-col'));
  }

  function getWeekContainer(columns){
    if(!columns.length) return null;
    return columns[0].parentElement;
  }

  function renderMobileDayControls(container){
    var controls = document.getElementById('pwaMobileDayControls');
    if(!container || !document.body.classList.contains('pwa-mobile-mode') || getActiveViewId() !== 'tasks'){
      if(controls) controls.remove();
      return null;
    }
    if(!controls){
      controls = document.createElement('div');
      controls.id = 'pwaMobileDayControls';
      controls.className = 'pwa-mobile-day-controls';
      controls.innerHTML = '<button type="button" data-day-step="-1" aria-label="Предыдущий день">←</button><strong></strong><button type="button" data-day-step="1" aria-label="Следующий день">→</button>';
      controls.addEventListener('click', function(event){
        var btn = event.target.closest('button[data-day-step]');
        if(!btn) return;
        event.preventDefault();
        mobileDayState.ymd = addDays(mobileDayState.ymd, Number(btn.getAttribute('data-day-step')) || 0);
        applyMobileWeekDayMode();
      });
      container.parentElement.insertBefore(controls, container);
    }
    var label = controls.querySelector('strong');
    if(label) label.textContent = ruDayLabel(mobileDayState.ymd);
    return controls;
  }

  function applyMobileWeekDayMode(){
    if(!document.body) return;
    var enabled = document.body.classList.contains('pwa-mobile-mode') && getActiveViewId() === 'tasks';
    var columns = getWeekColumns();
    var container = getWeekContainer(columns);
    if(!enabled || !columns.length){
      document.body.classList.remove('pwa-mobile-week-day-mode');
      var oldControls = document.getElementById('pwaMobileDayControls');
      if(oldControls) oldControls.remove();
      columns.forEach(function(col){ col.classList.remove('pwa-active-day'); });
      return;
    }

    var dated = columns.map(function(col){ return { col: col, ymd: parseDateFromText(col.textContent) }; }).filter(function(item){ return !!item.ymd; });
    if(!dated.length) return;

    if(!dated.some(function(item){ return item.ymd === mobileDayState.ymd; })){
      var today = toYmd(new Date());
      mobileDayState.ymd = dated.some(function(item){ return item.ymd === today; }) ? today : dated[0].ymd;
    }

    document.body.classList.add('pwa-mobile-week-day-mode');
    dated.forEach(function(item){ item.col.classList.toggle('pwa-active-day', item.ymd === mobileDayState.ymd); });
    renderMobileDayControls(container);
  }

  window.renderMobileBottomNav = renderMobileBottomNav;
  window.applyMobileWeekDayMode = applyMobileWeekDayMode;

  function applyPwaMobileMode(){
    if(!document.body) return;
    document.body.classList.toggle('pwa-mobile-mode', isPwaMobileMode());
    renderMobileBottomNav();
    applyMobileWeekDayMode();
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
    applyMobileWeekDayMode();
  });
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      viewObserver.observe(document.body, { subtree: true, attributes: true, childList: true, attributeFilter: ['class'] });
    }, { once: true });
  } else if(document.body){
    viewObserver.observe(document.body, { subtree: true, attributes: true, childList: true, attributeFilter: ['class'] });
  }
  setInterval(function(){ renderMobileBottomNav(); applyMobileWeekDayMode(); }, 800);

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
    setTimeout(function(){ applyPwaMobileMode(); enforceMobileViewSet(); applyMobileWeekDayMode(); }, 0);
  };
  runtime.onerror = function(){
    console.error('Project Tracker runtime failed to load');
    var status = document.getElementById('sideStatusText');
    if(status) status.textContent = 'Не удалось загрузить основной runtime приложения.';
  };
  document.head.appendChild(runtime);
})();
