(function(){
  'use strict';

  if(window.__PT_THEME_SETTINGS_V1__) return;
  window.__PT_THEME_SETTINGS_V1__ = true;

  var KEY = 'pt_app_theme_v1';
  var THEMES = ['soft', 'classic'];
  var PROJECT_PALETTE = ['#006164', '#8a5a34', '#5d5f9b', '#a24b52', '#3f7652', '#966f1f', '#386d88', '#805787', '#b35d32', '#52706d'];
  var colorFrame = 0;

  function readTheme(){
    var theme = window.__PT_APP_THEME__ || 'soft';
    try{ theme = localStorage.getItem(KEY) || theme; }catch(e){}
    return THEMES.indexOf(theme) >= 0 ? theme : 'soft';
  }

  function ensurePanel(){
    var grid = document.querySelector('#settings .settings-grid');
    if(!grid || document.getElementById('appThemePanel')) return;
    var panel = document.createElement('div');
    panel.id = 'appThemePanel';
    panel.className = 'panel app-theme-panel';
    panel.innerHTML = '<div class="panel-head"><div><h3>Стиль приложения</h3><p class="muted">Выберите оформление. Настройка сохранится на этом устройстве.</p></div></div><div class="app-theme-options" role="radiogroup" aria-label="Стиль приложения"><button class="app-theme-option" type="button" data-app-theme="soft" role="radio" aria-checked="true"><span class="app-theme-preview soft" aria-hidden="true"><i></i><i></i><i></i></span><span><b>Тёплый рельефный</b><small>Кремовые поверхности и бирюзовые акценты</small></span></button><button class="app-theme-option" type="button" data-app-theme="classic" role="radio" aria-checked="false"><span class="app-theme-preview classic" aria-hidden="true"><i></i><i></i><i></i></span><span><b>Классический светлый</b><small>Белые карточки и синие акценты</small></span></button></div><p class="muted app-theme-status" id="appThemeStatus" aria-live="polite"></p>';
    grid.insertBefore(panel, grid.firstChild);
  }

  function syncControls(theme){
    document.querySelectorAll('[data-app-theme]').forEach(function(button){
      var selected = button.dataset.appTheme === theme;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-checked', selected ? 'true' : 'false');
    });
    var status = document.getElementById('appThemeStatus');
    if(status) status.textContent = theme === 'soft'
      ? 'Сейчас используется тёплый рельефный стиль.'
      : 'Сейчас используется классический светлый стиль.';
  }

  function projectColor(label){
    var hash = 2166136261;
    String(label || 'Без проекта').split('').forEach(function(character){
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    });
    return PROJECT_PALETTE[Math.abs(hash) % PROJECT_PALETTE.length];
  }

  function rgba(hex, alpha){
    var value = String(hex).replace('#', '');
    var number = parseInt(value, 16) || 0;
    return 'rgba(' + ((number >> 16) & 255) + ',' + ((number >> 8) & 255) + ',' + (number & 255) + ',' + alpha + ')';
  }

  function needsProjectColor(value){
    value = String(value || '').trim().toLowerCase().replace(/\s/g, '');
    return !value || value === '#111827' || value === '#64748b' || value === '#000000' || value === 'rgb(17,24,39)' || value === 'rgb(100,116,139)';
  }

  function syncProjectColors(){
    document.querySelectorAll('.task-card.wk-task').forEach(function(card){
      var project = card.querySelector(':scope > p');
      var accent = card.style.getPropertyValue('--accent');
      if(!project || !needsProjectColor(accent)) return;
      var color = projectColor(project.textContent.trim());
      card.style.setProperty('--accent', color);
      card.style.setProperty('--bg', rgba(color, .12));
      card.style.setProperty('--bd', rgba(color, .34));
    });
    document.querySelectorAll('.timeline-event').forEach(function(event){
      var project = event.querySelector('small');
      var accent = event.style.getPropertyValue('--accent');
      if(!project || !needsProjectColor(accent)) return;
      var color = projectColor(project.textContent.trim());
      event.style.setProperty('--accent', color);
      event.style.setProperty('--bg', rgba(color, .18));
    });
  }

  function scheduleProjectColors(){
    if(colorFrame) return;
    colorFrame = requestAnimationFrame(function(){ colorFrame = 0; syncProjectColors(); });
  }

  function applyTheme(theme, persist){
    theme = THEMES.indexOf(theme) >= 0 ? theme : 'soft';
    window.__PT_APP_THEME__ = theme;
    document.body.classList.toggle('reference-theme', theme === 'soft');
    document.body.dataset.appTheme = theme;
    document.documentElement.style.colorScheme = 'light';
    if(persist !== false){
      try{ localStorage.setItem(KEY, theme); }catch(e){}
    }
    syncControls(theme);
    scheduleProjectColors();
    window.dispatchEvent(new CustomEvent('app-theme-change', { detail: { theme: theme } }));
  }

  function bind(){
    ensurePanel();
    syncControls(readTheme());
    scheduleProjectColors();
    if(window.MutationObserver){
      new MutationObserver(scheduleProjectColors).observe(document.body, { childList: true, subtree: true });
    }
    document.addEventListener('click', function(event){
      var button = event.target.closest('[data-app-theme]');
      if(!button) return;
      event.preventDefault();
      applyTheme(button.dataset.appTheme, true);
    });
  }

  window.ProjectTrackerTheme = { get: readTheme, set: function(theme){ applyTheme(theme, true); } };
  applyTheme(readTheme(), false);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
