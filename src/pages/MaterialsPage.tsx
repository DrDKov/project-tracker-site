import React from 'react';
import { useWorkspaceState } from '../react/state/useWorkspaceStore';
import { useWorkspaceUiStore } from '../shared/store/uiStore';
import { createMaterialsPageModel } from '../react/materials/materialsModel';
import { MaterialsPage as MaterialsPageView } from '../react/materials/MaterialsPage';

export function MaterialsPage() {
  const state = useWorkspaceState();
  const ui = useWorkspaceUiStore();
  const [tab, setTab] = React.useState<'templates' | 'documents'>('templates');
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null);
  const model = createMaterialsPageModel({ tab, query: ui.filters.materialSearch, owner: state.profile?.role === 'owner', loading: false, edit: false, selectedTemplateId, selectedFolderId, templates: state.materialTemplates || [], folders: state.materialFolders || [], files: state.materialFiles || [] });
  const actions = {
    setQuery: (query: string) => ui.setFilter('materialSearch', query),
    clearQuery: () => ui.setFilter('materialSearch', ''),
    setTab,
    reload: () => undefined,
    newTemplate: () => undefined,
    selectTemplate: setSelectedTemplateId,
    editTemplate: setSelectedTemplateId,
    cancelTemplate: () => undefined,
    saveTemplate: () => undefined,
    deleteTemplate: () => undefined,
    copyTemplate: async () => undefined,
    newFolder: () => undefined,
    selectFolder: setSelectedFolderId,
    renameFolder: () => undefined,
    deleteFolder: () => undefined,
    uploadFile: () => undefined,
    openFile: () => undefined,
    deleteFile: () => undefined,
    openSearchResult: (result: any) => { if (result.kind === 'template') setSelectedTemplateId(result.id); if (result.folderId) setSelectedFolderId(result.folderId); }
  };
  return <MaterialsPageView model={model} actions={actions as any} />;
}
export default MaterialsPage;
