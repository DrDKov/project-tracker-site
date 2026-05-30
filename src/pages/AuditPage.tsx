import React from 'react';
import { useWorkspaceState } from '../react/state/useWorkspaceStore';
import { AuditLog } from '../react/audit/AuditLog';
import { createAuditLogModel } from '../react/audit/auditModel';
import { dt } from './pageUtils';

function logPayload(record: Record<string, unknown>) {
  const payload = record.payload;
  if (typeof payload === 'string') {
    try { return JSON.parse(payload); } catch { return { raw: payload }; }
  }
  return payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
}
function shortJson(value: unknown) {
  const text = JSON.stringify(value, null, 2);
  return text && text !== '{}' ? text : '';
}
function logContext(record: Record<string, unknown>) {
  return [record.entity_type, record.entity_id].filter(Boolean).join(' · ');
}

export function AuditPage() {
  const state = useWorkspaceState();
  const model = createAuditLogModel({ logs: state.logs || [], dt, logPayload, shortJson, logContext });
  return <section className="panel react-audit-page"><AuditLog model={model} /></section>;
}
export default AuditPage;
