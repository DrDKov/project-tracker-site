// @ts-nocheck
import React from 'react';
import { useWorkspaceState } from '../react/state/useWorkspaceStore';
import { useWorkspaceUiStore } from '../shared/store/uiStore';
import { createMaterialsPageModel } from '../react/materials/materialsModel';
import { MaterialsPage as MaterialsPageView } from '../react/materials/MaterialsPage';
import { createWorkspaceRepositorySet } from '../repositories/index.ts';
import { createMaterialActionController } from '../controllers/materials/materialActions.ts';
import { invalidateWorkspaceData } from '../app/workspaceRuntime';

const MATERIALS_BUCKET = 'workspace-materials';
const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

function message(value) {
  return value && typeof value === 'object' && 'message' in value ? String(value.message) : String(value || '');
}

function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function MaterialsPage() {
  const state = useWorkspaceState();
  const ui = useWorkspaceUiStore();
  const [tab, setTab] = React.useState('templates');
  const [selectedTemplateId, setSelectedTemplateId] = React.useState(null);
  const [selectedFolderId, setSelectedFolderId] = React.useState(null);
  const [edit, setEdit] = React.useState(false);

  const workspaceId = React.useMemo(() => {
    return (state.projects || []).find((project) => project.workspace_id)?.workspace_id || DEFAULT_WORKSPACE_ID;
  }, [state.projects]);

  const materialActions = React.useMemo(() => {
    if (!state.sb) return null;
    const repository = createWorkspaceRepositorySet(state.sb).materials;
    return createMaterialActionController({
      repository,
      context: () => ({ workspaceId, currentUserId: state.profile?.id || null, bucket: MATERIALS_BUCKET }),
      reload: () => invalidateWorkspaceData()
    });
  }, [state.sb, state.profile?.id, workspaceId]);

  const model = React.useMemo(() => createMaterialsPageModel({
    tab,
    query: ui.filters.materialSearch,
    owner: state.profile?.role === 'owner',
    loading: Boolean(state.loading),
    edit,
    selectedTemplateId,
    selectedFolderId,
    templates: state.materialTemplates || [],
    folders: state.materialFolders || [],
    files: state.materialFiles || []
  }), [tab, ui.filters.materialSearch, state.profile?.role, state.loading, edit, selectedTemplateId, selectedFolderId, state.materialTemplates, state.materialFolders, state.materialFiles]);

  React.useEffect(() => {
    if (!selectedTemplateId && model.selectedTemplate?.id) setSelectedTemplateId(model.selectedTemplate.id);
  }, [selectedTemplateId, model.selectedTemplate?.id]);

  React.useEffect(() => {
    if (!selectedFolderId && model.selectedFolder?.id) setSelectedFolderId(model.selectedFolder.id);
  }, [selectedFolderId, model.selectedFolder?.id]);

  async function guarded(fn) {
    try {
      return await fn();
    } catch (error) {
      alert(message(error));
      throw error;
    }
  }

  const actions = {
    setQuery: (query) => ui.setFilter('materialSearch', query),
    clearQuery: () => ui.setFilter('materialSearch', ''),
    setTab: (nextTab) => { setTab(nextTab); setEdit(false); },
    reload: () => invalidateWorkspaceData(),
    newTemplate: () => { setSelectedTemplateId(null); setEdit(true); setTab('templates'); },
    selectTemplate: (id) => { setSelectedTemplateId(id); setEdit(false); },
    editTemplate: (id) => { setSelectedTemplateId(id); setEdit(true); },
    cancelTemplate: () => setEdit(false),
    saveTemplate: (id, title, body) => guarded(async () => {
      if (!materialActions) throw new Error('База материалов не подключена');
      const saved = await materialActions.saveTemplate(id || null, String(title || ''), String(body || ''));
      setSelectedTemplateId(saved.id);
      setEdit(false);
    }),
    deleteTemplate: (id) => guarded(async () => {
      if (!materialActions) throw new Error('База материалов не подключена');
      if (!id || !confirm('Удалить шаблон?')) return;
      await materialActions.deleteTemplate(id);
      setSelectedTemplateId(null);
      setEdit(false);
    }),
    copyTemplate: async (id) => {
      const template = (state.materialTemplates || []).find((item) => item.id === id);
      if (!template) return;
      await navigator.clipboard.writeText(template.body || template.content || '');
      alert('Текст скопирован');
    },
    newFolder: () => guarded(async () => {
      if (!materialActions) throw new Error('База материалов не подключена');
      const name = prompt('Название папки');
      if (!name || !name.trim()) return;
      const folder = await materialActions.createFolder(name);
      setSelectedFolderId(folder.id);
      setTab('documents');
    }),
    selectFolder: setSelectedFolderId,
    renameFolder: (id) => guarded(async () => {
      if (!materialActions) throw new Error('База материалов не подключена');
      const folder = (state.materialFolders || []).find((item) => item.id === id);
      if (!folder) return;
      const name = prompt('Новое название', folder.name || '');
      if (!name || !name.trim()) return;
      await materialActions.renameFolder(id, name);
    }),
    deleteFolder: (id) => guarded(async () => {
      if (!materialActions) throw new Error('База материалов не подключена');
      if (!id || !confirm('Удалить папку?')) return;
      await materialActions.deleteFolder(id);
      setSelectedFolderId(null);
    }),
    uploadFile: (file) => guarded(async () => {
      if (!materialActions) throw new Error('База материалов не подключена');
      const folderId = model.selectedFolder?.id || selectedFolderId;
      if (!folderId) throw new Error('Сначала выберите папку');
      await materialActions.uploadFile(folderId, file, uuid());
    }),
    openFile: (id) => guarded(async () => {
      if (!materialActions) throw new Error('База материалов не подключена');
      const file = (state.materialFiles || []).find((item) => item.id === id);
      if (!file?.storage_path) throw new Error('Файл не найден в хранилище');
      const signedUrl = await materialActions.signedUrl(file.storage_path, 600);
      window.open(signedUrl, '_blank', 'noopener');
    }),
    deleteFile: (id) => guarded(async () => {
      if (!materialActions) throw new Error('База материалов не подключена');
      const file = (state.materialFiles || []).find((item) => item.id === id);
      if (!file || !confirm('Удалить файл?')) return;
      await materialActions.deleteFile(file);
    }),
    openSearchResult: (result) => {
      ui.setFilter('materialSearch', '');
      if (result.kind === 'template') {
        setTab('templates');
        setSelectedTemplateId(result.id);
        setEdit(false);
      } else {
        setTab('documents');
        setSelectedFolderId(result.folderId || result.id || null);
      }
    }
  };

  return <MaterialsPageView model={model} actions={actions} />;
}
export default MaterialsPage;
