// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';

/** @typedef {import('./materialsModel.ts').MaterialsPageModel} MaterialsPageModel */
/** @typedef {import('./materialsModel.ts').MaterialsTab} MaterialsTab */
/** @typedef {import('./materialsModel.ts').MaterialTemplate} MaterialTemplate */

/**
 * @typedef {Object} MaterialsPageActions
 * @property {(query: string) => void} setQuery
 * @property {() => void} clearQuery
 * @property {(tab: MaterialsTab) => void} setTab
 * @property {() => Promise<void> | void} reload
 * @property {() => void} newTemplate
 * @property {(id: string) => void} selectTemplate
 * @property {(id: string) => void} editTemplate
 * @property {() => void} cancelTemplate
 * @property {(id: string | null, title: string, body: string) => Promise<void> | void} saveTemplate
 * @property {(id: string) => Promise<void> | void} deleteTemplate
 * @property {(id: string) => Promise<void> | void} copyTemplate
 * @property {() => Promise<void> | void} newFolder
 * @property {(id: string) => void} selectFolder
 * @property {(id: string) => Promise<void> | void} renameFolder
 * @property {(id: string) => Promise<void> | void} deleteFolder
 * @property {(file: File) => Promise<void> | void} uploadFile
 * @property {(id: string) => Promise<void> | void} openFile
 * @property {(id: string) => Promise<void> | void} deleteFile
 * @property {(result: { kind: string, id: string, folderId?: string }) => void} openSearchResult
 */

/** @param {{ model: MaterialsPageModel, actions: MaterialsPageActions }} props */
export function MaterialsPage({ model, actions }) {
  if (!model.owner) {
    return <div className="materials-denied">Нет доступа</div>;
  }

  if (model.loading) {
    return (
      <div className="panel react-materials-panel">
        <div className="materials-empty">Загружаю материалы...</div>
      </div>
    );
  }

  return (
    <div className="react-materials-shell">
      <div className="panel react-materials-header">
        <div className="panel-head">
          <div>
            <h3>Материалы</h3>
            <p className="muted">Закрытый раздел владельца workspace</p>
          </div>
          <button className="btn secondary" type="button" onClick={() => actions.reload()}>Обновить</button>
        </div>
        <div className="materials-search react-materials-search">
          <input
            className="input"
            id="materialsSearch"
            placeholder="Поиск по шаблонам, файлам и папкам"
            value={model.query}
            onChange={(event) => actions.setQuery(event.target.value)}
          />
          <button className="btn secondary" type="button" onClick={actions.clearQuery}>Сброс</button>
        </div>
        <div className="react-materials-stats" aria-live="polite">
          <span>Шаблонов: <b>{model.totalTemplates}</b></span>
          <span>Папок: <b>{model.totalFolders}</b></span>
          <span>Файлов: <b>{model.totalFiles}</b></span>
        </div>
      </div>

      <div className="materials-tabs" role="tablist" aria-label="Разделы материалов">
        <button
          type="button"
          role="tab"
          aria-selected={model.tab === 'templates'}
          className={`materials-tab ${model.tab === 'templates' ? 'active' : ''}`}
          onClick={() => actions.setTab('templates')}
        >
          Шаблоны
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={model.tab === 'documents'}
          className={`materials-tab ${model.tab === 'documents' ? 'active' : ''}`}
          onClick={() => actions.setTab('documents')}
        >
          Документы
        </button>
      </div>

      {model.query ? <SearchResults model={model} actions={actions} /> : null}
      {model.tab === 'templates'
        ? <TemplatesTab model={model} actions={actions} />
        : <DocumentsTab model={model} actions={actions} />}
    </div>
  );
}

/** @param {{ model: MaterialsPageModel, actions: MaterialsPageActions }} props */
function SearchResults({ model, actions }) {
  if (!model.searchResults.length) return null;
  return (
    <div className="materials-search-results react-materials-search-results">
      <h4>Результаты поиска</h4>
      <div className="react-materials-result-grid">
        {model.searchResults.slice(0, 12).map((result) => (
          <button
            type="button"
            className="materials-row"
            key={`${result.kind}:${result.id}`}
            onClick={() => actions.openSearchResult(result)}
          >
            <b>{result.title}</b>
            <span>{result.meta}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** @param {{ model: MaterialsPageModel, actions: MaterialsPageActions }} props */
function TemplatesTab({ model, actions }) {
  const template = model.selectedTemplate;
  return (
    <div className="materials-grid react-materials-grid">
      <aside className="materials-list react-materials-list">
        <div className="materials-actions">
          <button className="btn blue" type="button" onClick={actions.newTemplate}>+ Шаблон</button>
        </div>
        {model.templateRows.length ? model.templateRows.map((row) => (
          <button
            type="button"
            key={row.id}
            className={`materials-row ${row.active ? 'active' : ''}`}
            onClick={() => actions.selectTemplate(row.id)}
          >
            <b>{row.title}</b>
            <span>{row.meta}</span>
          </button>
        )) : <div className="materials-empty">Шаблонов пока нет</div>}
      </aside>
      <main className="materials-main react-materials-main">
        <TemplateContent template={template} edit={model.edit} actions={actions} />
      </main>
    </div>
  );
}

/** @param {{ template: MaterialTemplate | null, edit: boolean, actions: MaterialsPageActions }} props */
function TemplateContent({ template, edit, actions }) {
  const [title, setTitle] = useState(template?.title || '');
  const [body, setBody] = useState(template?.body || '');

  useEffect(() => {
    setTitle(template?.title || '');
    setBody(template?.body || '');
  }, [template?.id, edit]);

  if (edit) {
    return (
      <div className="materials-editor react-materials-editor">
        <input
          className="input"
          id="templateTitle"
          placeholder="Название шаблона"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <textarea
          className="input"
          id="templateBody"
          placeholder="Текст шаблона"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <div className="materials-actions">
          <button className="btn primary" type="button" onClick={() => actions.saveTemplate(template?.id || null, title, body)}>Сохранить</button>
          <button className="btn secondary" type="button" onClick={actions.cancelTemplate}>Отмена</button>
        </div>
      </div>
    );
  }

  if (!template) return <div className="materials-empty">Выберите шаблон или создайте новый</div>;

  return (
    <div className="react-materials-template-view">
      <div className="materials-actions">
        <button className="btn secondary" type="button" onClick={() => actions.editTemplate(template.id)}>Редактировать</button>
        <button className="btn secondary" type="button" onClick={() => actions.copyTemplate(template.id)}>Копировать</button>
        <button className="btn danger" type="button" onClick={() => actions.deleteTemplate(template.id)}>Удалить</button>
      </div>
      <h3>{template.title || 'Без названия'}</h3>
      <div className="materials-body">{template.body || 'Пустой шаблон'}</div>
    </div>
  );
}

/** @param {{ model: MaterialsPageModel, actions: MaterialsPageActions }} props */
function DocumentsTab({ model, actions }) {
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const selectedFolderId = model.selectedFolder?.id || '';
  const canUseFolder = Boolean(selectedFolderId);
  const uploadLabel = useMemo(() => canUseFolder ? 'Загрузить файл' : 'Сначала создайте папку', [canUseFolder]);

  return (
    <div className="materials-doc-layout react-materials-doc-layout">
      <aside className="materials-list react-materials-list">
        <div className="materials-actions">
          <button className="btn blue" type="button" onClick={actions.newFolder}>+ Папка</button>
        </div>
        {model.folderRows.length ? model.folderRows.map((row) => (
          <button
            type="button"
            key={row.id}
            className={`materials-row ${row.active ? 'active' : ''}`}
            onClick={() => actions.selectFolder(row.id)}
          >
            <b>{row.name}</b>
            <span>{row.meta}</span>
          </button>
        )) : <div className="materials-empty">Папок пока нет</div>}
      </aside>
      <main className="materials-main react-materials-main">
        <div className="materials-actions">
          <button className="btn secondary" type="button" disabled={!canUseFolder} onClick={() => actions.renameFolder(selectedFolderId)}>Переименовать</button>
          <button className="btn danger" type="button" disabled={!canUseFolder} onClick={() => actions.deleteFolder(selectedFolderId)}>Удалить папку</button>
          <button className="btn primary" type="button" disabled={!canUseFolder} onClick={() => inputRef.current?.click()}>{uploadLabel}</button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) actions.uploadFile(file);
              event.currentTarget.value = '';
            }}
          />
        </div>
        <h3>{model.selectedFolder?.name || 'Документы'}</h3>
        {model.fileRows.length ? model.fileRows.map((file) => (
          <div className="materials-file react-materials-file" key={file.id}>
            <div>
              <b>{file.name}</b>
              <span>{file.meta}</span>
            </div>
            <div className="materials-actions">
              <button className="btn secondary sm" type="button" onClick={() => actions.openFile(file.id)}>Открыть</button>
              <button className="btn danger sm" type="button" onClick={() => actions.deleteFile(file.id)}>Удалить</button>
            </div>
          </div>
        )) : <div className="materials-empty">В папке нет файлов</div>}
      </main>
    </div>
  );
}
