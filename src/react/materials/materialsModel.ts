// @ts-nocheck

/**
 * @typedef {Object} MaterialTemplate
 * @property {string} id
 * @property {string=} workspace_id
 * @property {string=} title
 * @property {string=} body
 * @property {string=} created_at
 * @property {string=} updated_at
 * @property {string|null=} deleted_at
 */

/**
 * @typedef {Object} MaterialFolder
 * @property {string} id
 * @property {string=} workspace_id
 * @property {string=} name
 * @property {string=} created_at
 * @property {string=} updated_at
 * @property {string|null=} deleted_at
 */

/**
 * @typedef {Object} MaterialFile
 * @property {string} id
 * @property {string} folder_id
 * @property {string=} workspace_id
 * @property {string=} original_name
 * @property {string=} storage_path
 * @property {string=} mime_type
 * @property {number=} size_bytes
 * @property {string=} created_at
 * @property {string|null=} deleted_at
 */

/**
 * @typedef {'templates' | 'documents'} MaterialsTab
 */

/**
 * @typedef {Object} MaterialsStateInput
 * @property {MaterialsTab=} tab
 * @property {string=} query
 * @property {boolean=} owner
 * @property {boolean=} loading
 * @property {boolean=} edit
 * @property {string|null=} selectedTemplateId
 * @property {string|null=} selectedFolderId
 * @property {MaterialTemplate[]=} templates
 * @property {MaterialFolder[]=} folders
 * @property {MaterialFile[]=} files
 */

/**
 * @typedef {Object} TemplateRowModel
 * @property {string} id
 * @property {string} title
 * @property {string} meta
 * @property {boolean} active
 */

/**
 * @typedef {Object} FolderRowModel
 * @property {string} id
 * @property {string} name
 * @property {string} meta
 * @property {boolean} active
 */

/**
 * @typedef {Object} FileRowModel
 * @property {string} id
 * @property {string} folderId
 * @property {string} name
 * @property {string} meta
 */

/**
 * @typedef {Object} MaterialSearchResultModel
 * @property {'template' | 'folder' | 'file'} kind
 * @property {string} id
 * @property {string=} folderId
 * @property {string} title
 * @property {string} meta
 */

/**
 * @typedef {Object} MaterialsPageModel
 * @property {MaterialsTab} tab
 * @property {string} query
 * @property {boolean} owner
 * @property {boolean} loading
 * @property {boolean} edit
 * @property {TemplateRowModel[]} templateRows
 * @property {FolderRowModel[]} folderRows
 * @property {FileRowModel[]} fileRows
 * @property {MaterialSearchResultModel[]} searchResults
 * @property {MaterialTemplate|null} selectedTemplate
 * @property {MaterialFolder|null} selectedFolder
 * @property {number} totalTemplates
 * @property {number} totalFolders
 * @property {number} totalFiles
 * @property {string} emptyLabel
 */

/** @param {unknown} value */
export function normalizeText(value) {
  return String(value || '').toLowerCase().trim();
}

/** @param {unknown} value */
export function formatMaterialDate(value) {
  try {
    return value ? new Date(String(value)).toLocaleString('ru-RU') : '';
  } catch {
    return '';
  }
}

/** @param {unknown} value */
export function formatMaterialBytes(value) {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) return '0 Б';
  if (size < 1024) return `${size} Б`;
  if (size < 1048576) return `${Math.round(size / 1024)} КБ`;
  return `${(size / 1048576).toFixed(1)} МБ`;
}

/**
 * @param {MaterialTemplate[]} templates
 * @param {string} query
 */
export function filterTemplates(templates, query) {
  const q = normalizeText(query);
  const active = (templates || []).filter((item) => !item.deleted_at);
  if (!q) return active;
  return active.filter((item) => normalizeText(`${item.title || ''} ${item.body || ''}`).includes(q));
}

/**
 * @param {MaterialFolder[]} folders
 * @param {string} query
 */
export function filterFolders(folders, query) {
  const q = normalizeText(query);
  const active = (folders || []).filter((item) => !item.deleted_at);
  if (!q) return active;
  return active.filter((item) => normalizeText(item.name).includes(q));
}

/**
 * @param {MaterialFile[]} files
 * @param {MaterialFolder[]} folders
 * @param {string} query
 */
export function filterFiles(files, folders, query) {
  const q = normalizeText(query);
  const active = (files || []).filter((item) => !item.deleted_at);
  if (!q) return active;
  return active.filter((item) => {
    const folder = folders.find((candidate) => candidate.id === item.folder_id);
    return normalizeText(`${item.original_name || ''} ${folder?.name || ''}`).includes(q);
  });
}

/**
 * @param {MaterialFile[]} files
 * @param {string|null|undefined} folderId
 */
export function filesForFolder(files, folderId) {
  if (!folderId) return [];
  return (files || []).filter((file) => !file.deleted_at && file.folder_id === folderId);
}

/**
 * @param {MaterialTemplate[]} templates
 * @param {MaterialFolder[]} folders
 * @param {MaterialFile[]} files
 * @param {string} query
 * @returns {MaterialSearchResultModel[]}
 */
export function createSearchResults(templates, folders, files, query) {
  if (!normalizeText(query)) return [];
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  return [
    ...filterTemplates(templates, query).map((template) => ({
      kind: /** @type {'template'} */ ('template'),
      id: template.id,
      title: template.title || 'Без названия',
      meta: 'Шаблон'
    })),
    ...filterFolders(folders, query).map((folder) => ({
      kind: /** @type {'folder'} */ ('folder'),
      id: folder.id,
      folderId: folder.id,
      title: folder.name || 'Без названия',
      meta: 'Папка'
    })),
    ...filterFiles(files, folders, query).map((file) => ({
      kind: /** @type {'file'} */ ('file'),
      id: file.id,
      folderId: file.folder_id,
      title: file.original_name || 'Файл',
      meta: `Файл · ${folderById.get(file.folder_id)?.name || 'Папка не указана'}`
    }))
  ];
}

/**
 * @param {MaterialsStateInput} input
 * @returns {MaterialsPageModel}
 */
export function createMaterialsPageModel(input) {
  const templates = (input.templates || []).filter((item) => !item.deleted_at);
  const folders = (input.folders || []).filter((item) => !item.deleted_at);
  const files = (input.files || []).filter((item) => !item.deleted_at);
  const selectedTemplate = templates.find((item) => item.id === input.selectedTemplateId) || templates[0] || null;
  const selectedFolder = folders.find((item) => item.id === input.selectedFolderId) || folders[0] || null;
  const selectedFolderFiles = filesForFolder(files, selectedFolder?.id).sort((left, right) => String(right.created_at || '').localeCompare(String(left.created_at || '')));

  const templateRows = filterTemplates(templates, input.query || '').map((template) => ({
    id: template.id,
    title: template.title || 'Без названия',
    meta: formatMaterialDate(template.updated_at || template.created_at),
    active: selectedTemplate?.id === template.id
  }));

  const folderRows = filterFolders(folders, input.query || '').map((folder) => ({
    id: folder.id,
    name: folder.name || 'Без названия',
    meta: `Файлов: ${filesForFolder(files, folder.id).length}`,
    active: selectedFolder?.id === folder.id
  }));

  const fileRows = selectedFolderFiles
    .filter((file) => !normalizeText(input.query) || filterFiles([file], folders, input.query || '').length)
    .map((file) => ({
      id: file.id,
      folderId: file.folder_id,
      name: file.original_name || 'Файл',
      meta: `${formatMaterialBytes(file.size_bytes)} · ${formatMaterialDate(file.created_at)}`
    }));

  return {
    tab: input.tab === 'documents' ? 'documents' : 'templates',
    query: input.query || '',
    owner: Boolean(input.owner),
    loading: Boolean(input.loading),
    edit: Boolean(input.edit),
    templateRows,
    folderRows,
    fileRows,
    searchResults: createSearchResults(templates, folders, files, input.query || ''),
    selectedTemplate,
    selectedFolder,
    totalTemplates: templates.length,
    totalFolders: folders.length,
    totalFiles: files.length,
    emptyLabel: input.tab === 'documents' ? 'Документов пока нет' : 'Шаблонов пока нет'
  };
}
