import React from 'react';
import { EmptyState } from '../../shared/ui';
import type { AuditLogModel } from './auditModel';

export function AuditLog({ model }: { model: AuditLogModel }) {
  if (!model.rows.length) return <EmptyState title={model.emptyLabel} />;
  return (
    <>
      {model.rows.map((row) => (
        <article className="audit-row react-audit-row" key={row.id}>
          <b>{row.action}</b>
          <span className="muted"> · {row.date}</span>
          {row.context ? <div className="audit-context">{row.context}</div> : null}
          {row.json ? <div className="audit-json">{row.json}</div> : null}
        </article>
      ))}
    </>
  );
}
