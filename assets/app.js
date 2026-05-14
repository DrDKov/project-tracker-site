/* Project Tracker PWA bootstrap. Loads the stable app runtime after installing PWA metadata. */
(function(){
  if(window.__PT_PWA_BOOTSTRAP__) return;
  window.__PT_PWA_BOOTSTRAP__ = true;

  function ensureLink(rel, href, attrs){
    var existing = document.querySelector('link[rel="'+rel+'"][href="'+href+'"]');
    if(existing) return existing;
    var el = document.createElement('link');
    el.rel = rel;
    el.href = href;
    if(attrs){
      Object.keys(attrs).forEach(function(key){ el.setAttribute(key, attrs[key]); });
    }
    document.head.appendChild(el);
    return el;
  }

  function ensureMeta(name, content){
    var existing = document.querySelector('meta[name="'+name+'"]');
    if(existing){
      existing.setAttribute('content', content);
      return existing;
    }
    var el = document.createElement('meta');
    el.name = name;
    el.content = content;
    document.head.appendChild(el);
    return el;
  }

  ensureLink('manifest', 'manifest.webmanifest');
  ensureMeta('theme-color', '#2563eb');
  ensureMeta('apple-mobile-web-app-capable', 'yes');
  ensureMeta('apple-mobile-web-app-status-bar-style', 'default');
  ensureMeta('apple-mobile-web-app-title', 'Project Tracker');
  ensureLink('apple-touch-icon', 'assets/icons/icon-192.png');

  if('serviceWorker' in navigator){
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('service-worker.js').catch(function(err){
        console.warn('Service worker registration failed', err);
      });
    });
  }

  var runtime = document.createElement('script');
  runtime.src = 'https://cdn.jsdelivr.net/gh/DrDKov/project-tracker-site@805be0b49a87b3f4d007f3d0de47340580369319/assets/app.js';
  runtime.async = false;
  runtime.onerror = function(){
    console.error('Project Tracker runtime failed to load');
    var status = document.getElementById('sideStatusText');
    if(status) status.textContent = 'Не удалось загрузить основной runtime приложения.';
  };
  document.head.appendChild(runtime);
})();
