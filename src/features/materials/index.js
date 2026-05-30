// @ts-check
import {
  currentProfile as getCurrentProfile,
  workspaceClient
} from '../../core/workspace-context.js';
import { canViewMaterials } from '../../core/permissions/index.js';
import { createWorkspaceRepositorySet } from '../../repositories/index.ts';
import { createMaterialActionController } from '../../controllers/materials/materialActions.ts';
import { createMaterialsPageModel } from '../../react/materials/materialsModel.ts';
import { mountMaterialsPage } from '../../react/materials/mountMaterialsPage.tsx';

/** @typedef {import('../../react/materials/materialsModel.ts').MaterialsTab} MaterialsTab */

(function materialsFeature() {
  if (window.__WORKSPACE_MATERIALS_REACT_STAGE7__) return;
  window.__WORKSPACE_MATERIALS_REACT_STAGE7__ = true;

  const BUCKET = 'workspace-materials';
  const WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

  /** @type {{ sb: any, me: any, owner: boolean, tab: MaterialsTab, query: string, templates: any[], folders: any[], files: any[], selectedTemplateId: string | null, selectedFolderId: string | null, edit: boolean, loading: boolean, lastCheck: number }} */
  const state = {
    sb: null,
    me: null,
    owner: false,
    tab: 'templates',
    query: '',
    templates: [],
    folders: [],
    files: [],
    selectedTemplateId: null,
    selectedFolderId: null,
    edit: false,
    loading: false,
    lastCheck: 0
  };

  /** @param {string} id */
  function $(id) { return document.getElementById(id); }

  function client() { return workspaceClient(); }

  function currentProfile() { return getCurrentProfile(); }

  function repositories() { return createWorkspaceRepositorySet(state.sb); }

  function materialRepository() { return repositories().materials; }

  function materialActions() {
    return createMaterialActionController({
      repository: materialRepository(),
      context: () => ({
        workspaceId: WORKSPACE_ID,
        currentUserId: state.me?.id || null,
        bucket: BUCKET
      }),
      reload: loadAll
    });
  }

  /** @param {unknown} value */
  function message(value) {
    return value && typeof value === 'object' && 'message' in value ? String(value.message) : String(value);
  }

  /** @param {unknown} error */
  function report(error) {
    alert(message(error));
  }

  async function detectOwner(force = false) {
    const sb = client();
    if (!sb) return false;
    state.sb = sb;
    if (!force && Date.now() - state.lastCheck < 3000) return state.owner;
    state.lastCheck = Date.now();

    const profile = currentProfile();
    if (profile && profile.id) {
      state.me = profile;
      state.owner = canViewMaterials(profile);
      return state.owner;
    }

    try {
      const fallbackProfile = await createWorkspaceRepositorySet(sb).materials.currentProfile();
      if (fallbackProfile) {
        state.me = fallbackProfile;
        state.owner = canViewMaterials(fallbackProfile);
        return state.owner;
      }
    } catch (error) {
      console.warn('[materials] owner detection failed', error);
    }

    state.owner = false;
    return false;
  }

  function ensureShell() {
    const oldButton = document.querySelector('.nav button[data-view="materials"]');
    const existingView = $('materials');

    if (!state.owner) {
      if (oldButton) oldButton.remove();
      if (existingView) existingView.remove();
      return;
    }

    const nav = document.querySelector('.nav');
    const audit = document.querySelector('.nav button[data-view="audit"]');
    if (oldButton) {
      oldButton.classList.remove('hidden');
      oldButton.style.display = '';
    }
    if (nav && !oldButton) {
      const button = document.createElement('button');
      button.dataset.view = 'materials';
      button.textContent = '▣ Материалы';
      if (audit) nav.insertBefore(button, audit);
      else nav.appendChild(button);
    }

    if (!$('materials')) {
      const section = document.createElement('section');
      section.id = 'materials';
      section.className = 'view';
      section.innerHTML = '<div class="materials-shell" id="materialsRoot"></div>';
      const auditSection = $('audit');
      const main = document.querySelector('.main');
      if (auditSection && auditSection.parentNode) auditSection.parentNode.insertBefore(section, auditSection);
      else if (main) main.appendChild(section);
    }
  }

  function pageModel() {
    return createMaterialsPageModel({
      owner: state.owner,
      loading: state.loading,
      tab: state.tab,
      query: state.query,
      edit: state.edit,
      selectedTemplateId: state.selectedTemplateId,
      selectedFolderId: state.selectedFolderId,
      templates: state.templates,
      folders: state.folders,
      files: state.files
    });
  }

  function syncSelection(model = pageModel()) {
    if (!state.selectedTemplateId && model.selectedTemplate?.id) state.selectedTemplateId = model.selectedTemplate.id;
    if (!state.selectedFolderId && model.selectedFolder?.id) state.selectedFolderId = model.selectedFolder.id;
  }

  function render() {
    const root = $('materialsRoot');
    if (!root) return;
    const model = pageModel();
    syncSelection(model);
    mountMaterialsPage(root, pageModel(), actions);
  }

  async function loadAll() {
    if (!state.owner || !state.sb) return;
    state.loading = true;
    render();
    try {
      const bundle = await materialRepository().bundle();
      state.templates = bundle.templates || [];
      state.folders = bundle.folders || [];
      state.files = bundle.files || [];
      if (!state.selectedTemplateId && state.templates[0]) state.selectedTemplateId = state.templates[0].id;
      if (!state.selectedFolderId && state.folders[0]) state.selectedFolderId = state.folders[0].id;
    } finally {
      state.loading = false;
      render();
    }
  }

  function open() {
    if (!state.owner) return;
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active', view.id === 'materials'));
    document.querySelectorAll('.nav button[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === 'materials'));
    const pageTitle = $('pageTitle');
    const pageSubtitle = $('pageSubtitle');
    if (pageTitle) pageTitle.textContent = 'Материалы';
    if (pageSubtitle) pageSubtitle.textContent = 'Закрытые шаблоны и документы владельца workspace';
    render();
  }

  async function saveTemplate(id, title, body) {
    const saved = await materialActions().saveTemplate(id || null, String(title || ''), String(body || ''));
    state.edit = false;
    state.selectedTemplateId = saved.id;
  }

  async function deleteTemplate(id) {
    if (!id || !confirm('Удалить шаблон?')) return;
    await materialActions().deleteTemplate(id);
    state.selectedTemplateId = null;
    state.edit = false;
  }

  async function copyTemplate(id) {
    const template = state.templates.find((item) => item.id === id);
    if (!template) return;
    await navigator.clipboard.writeText(template.body || '');
    alert('Текст скопирован');
  }

  async function createFolder() {
    const name = prompt('Название папки');
    if (!name || !name.trim()) return;
    const folder = await materialActions().createFolder(name);
    state.selectedFolderId = folder.id;
    state.tab = 'documents';
  }

  async function renameFolder(id) {
    const folder = state.folders.find((item) => item.id === id);
    if (!folder) return;
    const name = prompt('Новое название', folder.name || '');
    if (!name || !name.trim()) return;
    await materialActions().renameFolder(id, name);
  }

  async function deleteFolder(id) {
    if (!id || !confirm('Удалить папку?')) return;
    await materialActions().deleteFolder(id);
    state.selectedFolderId = null;
  }

  async function upload(file) {
    if (!state.selectedFolderId) return alert('Сначала выберите папку');
    const id = crypto.randomUUID();
    await materialActions().uploadFile(state.selectedFolderId, file, id);
  }

  async function openFile(id) {
    const file = state.files.find((item) => item.id === id);
    if (!file) return;
    const signedUrl = await materialActions().signedUrl(file.storage_path, 600);
    window.open(signedUrl, '_blank', 'noopener');
  }

  async function deleteFile(id) {
    const file = state.files.find((item) => item.id === id);
    if (!file || !confirm('Удалить файл?')) return;
    await materialActions().deleteFile(file);
  }

  const actions = {
    setQuery(query) {
      state.query = query;
      render();
    },
    clearQuery() {
      state.query = '';
      render();
    },
    /** @param {MaterialsTab} tab */
    setTab(tab) {
      state.tab = tab;
      state.edit = false;
      render();
    },
    reload() { return loadAll().catch(report); },
    newTemplate() {
      state.selectedTemplateId = null;
      state.edit = true;
      state.tab = 'templates';
      render();
    },
    selectTemplate(id) {
      state.selectedTemplateId = id;
      state.edit = false;
      render();
    },
    editTemplate(id) {
      state.selectedTemplateId = id;
      state.edit = true;
      render();
    },
    cancelTemplate() {
      state.edit = false;
      render();
    },
    saveTemplate(id, title, body) { return saveTemplate(id, title, body).catch(report); },
    deleteTemplate(id) { return deleteTemplate(id).catch(report); },
    copyTemplate(id) { return copyTemplate(id).catch(report); },
    newFolder() { return createFolder().catch(report); },
    selectFolder(id) {
      state.selectedFolderId = id;
      render();
    },
    renameFolder(id) { return renameFolder(id).catch(report); },
    deleteFolder(id) { return deleteFolder(id).catch(report); },
    uploadFile(file) { return upload(file).catch(report); },
    openFile(id) { return openFile(id).catch(report); },
    deleteFile(id) { return deleteFile(id).catch(report); },
    openSearchResult(result) {
      if (result.kind === 'template') {
        state.query = '';
        state.tab = 'templates';
        state.selectedTemplateId = result.id;
        state.edit = false;
      } else if (result.kind === 'folder') {
        state.query = '';
        state.tab = 'documents';
        state.selectedFolderId = result.id;
      } else if (result.kind === 'file') {
        state.query = '';
        state.tab = 'documents';
        state.selectedFolderId = result.folderId || null;
      }
      open();
    }
  };

  document.addEventListener('click', (event) => {
    const navButton = event.target.closest?.('.nav button[data-view="materials"]');
    if (!navButton) return;
    event.preventDefault();
    event.stopPropagation();
    open();
  }, true);

  async function tick() {
    const wasOwner = state.owner;
    await detectOwner(false);
    ensureShell();
    if (state.owner && !wasOwner) loadAll().catch(report);
    const materialsActive = $('materials')?.classList.contains('active');
    if (materialsActive && !state.owner) {
      const fallback = document.querySelector('.nav button[data-view="tasks"],.nav button[data-view="overview"]');
      if (fallback) fallback.click();
    }
  }

  setInterval(tick, 1000);
  tick();
})();
