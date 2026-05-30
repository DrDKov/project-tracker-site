// @ts-check
import { createAuditLogModel } from '../../react/audit/auditModel.ts';
import { mountAuditLog } from '../../react/audit/mountAuditLog.tsx';

/** @typedef {import('../../types/entities.js').AppState} AppState */
/** @typedef {Record<string, any>} AuditRecord */

/**
 * Thin Stage 25 audit facade. React owns the audit presentation; this adapter
 * only builds a view model from legacy runtime state until runtime-compatibility bridge is gone.
 * @param {{
 *   S: AppState,
 *   $: (id: string) => HTMLElement | null,
 *   dt: (value?: string | null) => string,
 *   logPayload: (record: AuditRecord) => Record<string, any>,
 *   shortJson: (value: unknown) => string,
 *   logContext: (record: AuditRecord) => string
 * }} deps
 */
export function createAuditRenderer(deps) {
  const { S, $, dt, logPayload, shortJson, logContext } = deps;

  function renderAudit() {
    const list = $('auditList');
    if (!list) return;
    mountAuditLog(list, createAuditLogModel({ logs: S.logs || [], dt, logPayload, shortJson, logContext }));
  }

  return { renderAudit };
}
