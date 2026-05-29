// @ts-check

/** @typedef {import('../../types/entities.js').AppState} AppState */
/** @typedef {Record<string, any>} AuditRecord */

/**
 * @param {{
 *   S: AppState,
 *   $: (id: string) => any,
 *   esc: (value: unknown) => string,
 *   dt: (value?: string | null) => string,
 *   logPayload: (record: AuditRecord) => Record<string, any>,
 *   shortJson: (value: unknown) => string,
 *   logContext: (record: AuditRecord) => string
 * }} deps
 */
export function createAuditRenderer(deps) {
  const { S, $, esc, dt, logPayload, shortJson, logContext } = deps;

  function renderAudit() {
    const list = $('auditList');
    if (!list) return;

    list.innerHTML = S.logs.length
      ? S.logs.map((record) => {
          const payload = logPayload(record);
          const json = shortJson(payload);
          const context = logContext(record);
          return `<article class="audit-row"><b>${esc(record.action || 'Изменение')}</b><span class="muted"> · ${dt(record.created_at)}</span>${context ? `<div class="audit-context">${esc(context)}</div>` : ''}${json ? `<div class="audit-json">${json}</div>` : ''}</article>`;
        }).join('')
      : '<div class="empty">Записей нет</div>';
  }

  return { renderAudit };
}
