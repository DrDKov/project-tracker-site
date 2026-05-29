import { currentPermissions, workspaceApp } from '../../core/workspace-context.js';

/* Central UI permission guard. Security is still enforced by Supabase RLS; this module only keeps the interface consistent. */
(function(){
  if (window.__WORKSPACE_PERMISSION_GUARD_V1__) return;
  window.__WORKSPACE_PERMISSION_GUARD_V1__ = true;

  function navButton(view) {
    return document.querySelector('.nav button[data-view="' + view + '"]');
  }

  function activeSection(view) {
    return document.getElementById(view);
  }

  function setVisible(view, visible) {
    const button = navButton(view);
    const section = activeSection(view);
    if (button) button.style.display = visible ? '' : 'none';
    if (!visible && section && section.classList.contains('active')) {
      const fallback = navButton('tasks') || navButton('overview');
      if (fallback) fallback.click();
      else section.classList.remove('active');
    }
  }

  function setActionState(selector, enabled) {
    document.querySelectorAll(selector).forEach((node) => {
      node.disabled = !enabled;
      node.classList.toggle('hidden', !enabled);
      node.setAttribute('aria-hidden', enabled ? 'false' : 'true');
    });
  }

  function apply() {
    const permissions = currentPermissions() || {};
    setVisible('materials', !!permissions.canViewMaterials);
    setVisible('audit', !!permissions.canViewAudit);
    setActionState('.admin-only', !!permissions.canManageWorkspace);
  }

  document.addEventListener('DOMContentLoaded', apply);
  window.addEventListener('workspace:state-change', apply);
  setInterval(apply, 1500);

  const app = workspaceApp();
  if (app && app.store && typeof app.store.subscribe === 'function') {
    app.store.subscribe(apply);
  }

  apply();
})();
