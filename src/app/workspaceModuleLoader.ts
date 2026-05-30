import type { WorkspaceModuleName } from './workspaceModules';

export interface WorkspaceModuleDefinition { name: WorkspaceModuleName; path: string; required?: boolean; }

const moduleLoaders = import.meta.glob(['../features/pwa/register.js']);
export const WORKSPACE_MODULES: readonly WorkspaceModuleDefinition[] = [
  { name: 'pwa', path: '../features/pwa/register.js' }
];
async function loadWorkspaceModule(item: WorkspaceModuleDefinition) { const loader = moduleLoaders[item.path]; if (!loader) throw new Error(`Workspace module loader is missing for ${item.path}`); return loader(); }
export async function bootWorkspaceModules() { if (window.__PT_APP_BOOTSTRAPPED__) return; window.__PT_APP_BOOTSTRAPPED__ = true; window.__PT_LOADED_MODULES__ = []; for (const item of WORKSPACE_MODULES) { await loadWorkspaceModule(item); window.__PT_LOADED_MODULES__.push(item.name); } }
export function bootWorkspaceModulesSafe() { bootWorkspaceModules().catch((error) => console.warn('Optional workspace module failed', error)); }
