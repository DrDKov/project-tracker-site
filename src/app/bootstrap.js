import '../styles/main.css';

const MODULES = [
  { name: 'runtime', load: () => import('./runtime.js'), required: true },
  { name: 'tasks', load: () => import('../features/tasks/index.js') },
  { name: 'timeline', load: () => import('../features/timeline/index.js') },
  { name: 'permissions', load: () => import('../features/permissions/index.js') },
  { name: 'materials', load: () => import('../features/materials/index.js') },
  { name: 'notifications', load: () => import('../features/notifications/index.js') },
  { name: 'notification-project-labels', load: () => import('../features/notifications/project-labels.js') },
  { name: 'mentions', load: () => import('../features/mentions/dropdown.js') },
  { name: 'ui', load: () => import('../features/ui/index.js') },
  { name: 'pwa', load: () => import('../features/pwa/register.js') }
];

function setLoaderError(error) {
  console.error('Workspace loader failed', error);
  const status = document.getElementById('sideStatusText');
  if (status) status.textContent = 'Ошибка загрузки приложения: ' + (error && error.message ? error.message : error);
}

async function boot() {
  if (window.__PT_APP_BOOTSTRAPPED__) return;
  window.__PT_APP_BOOTSTRAPPED__ = true;
  window.__PT_LOADED_MODULES__ = [];

  for (const item of MODULES) {
    try {
      await item.load();
      window.__PT_LOADED_MODULES__.push(item.name);
    } catch (error) {
      if (item.required) throw error;
      console.warn(`Optional module failed: ${item.name}`, error);
    }
  }
}

boot().catch(setLoaderError);
