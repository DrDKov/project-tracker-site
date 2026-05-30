import assert from 'node:assert/strict';
import {
  createMaterialsPageModel,
  createSearchResults,
  filterFiles,
  filterFolders,
  filterTemplates,
  formatMaterialBytes
} from '../../src/react/materials/materialsModel.ts';

const templates = [
  { id: 'tpl1', title: 'Согласия', body: 'Текст согласия', updated_at: '2026-06-01T10:00:00Z' },
  { id: 'tpl2', title: 'Архивный', body: 'Удалён', deleted_at: '2026-06-02T10:00:00Z' }
];
const folders = [
  { id: 'f1', name: 'Салым' },
  { id: 'f2', name: 'Пром медицина' }
];
const files = [
  { id: 'file1', folder_id: 'f1', original_name: 'Согласия_Пром_мед.pdf', size_bytes: 2048, created_at: '2026-06-03T10:00:00Z' },
  { id: 'file2', folder_id: 'f2', original_name: 'Акт.docx', size_bytes: 1048576, created_at: '2026-06-04T10:00:00Z' }
];

assert.equal(formatMaterialBytes(512), '512 Б');
assert.equal(formatMaterialBytes(2048), '2 КБ');
assert.equal(formatMaterialBytes(1048576), '1.0 МБ');
assert.equal(filterTemplates(templates, 'соглас').length, 1);
assert.equal(filterFolders(folders, 'салым').length, 1);
assert.equal(filterFiles(files, folders, 'пром').length, 2);

const model = createMaterialsPageModel({
  owner: true,
  tab: 'documents',
  query: '',
  templates,
  folders,
  files,
  selectedFolderId: 'f1'
});
assert.equal(model.owner, true);
assert.equal(model.totalTemplates, 1);
assert.equal(model.totalFolders, 2);
assert.equal(model.totalFiles, 2);
assert.equal(model.selectedFolder?.name, 'Салым');
assert.equal(model.fileRows.length, 1);
assert.equal(model.fileRows[0].name, 'Согласия_Пром_мед.pdf');

const results = createSearchResults(templates, folders, files, 'соглас');
assert.equal(results.some((item) => item.kind === 'template' && item.title === 'Согласия'), true);
assert.equal(results.some((item) => item.kind === 'file' && item.title === 'Согласия_Пром_мед.pdf'), true);

console.log('materials model tests passed');
