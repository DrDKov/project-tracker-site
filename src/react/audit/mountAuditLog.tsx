import React from 'react';
import { renderReactIsland } from '../core/createReactIsland';
import { AuditLog } from './AuditLog';
import type { AuditLogModel } from './auditModel';

export function mountAuditLog(container: HTMLElement | null, model: AuditLogModel) {
  if (!container) return null;
  return renderReactIsland(container, <AuditLog model={model} />);
}
