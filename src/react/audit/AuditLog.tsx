import React from 'react';
import { EmptyState } from '../../shared/ui';
import type { AuditLogModel } from './auditModel';

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

function maskAuditDetails(value: string) {
  const maskedEmails = value.replace(EMAIL_RE, (email) => {
    const [name, domain] = email.split('@');
    const safeName = name.length > 2 ? `${name.slice(0, 2)}***` : `${name.charAt(0) || '*'}***`;
    return `${safeName}@${domain}`;
  });
  return maskedEmails.replace(UUID_RE, (id) => `${id.slice(0, 8)}...${id.slice(-4)}`);
}

function formatAuditDetails(value: string) {
  const masked = maskAuditDetails(value);
  try {
    return JSON.stringify(JSON.parse(masked), null, 2);
  } catch {
    return masked;
  }
}

export function AuditLog({ model }: { model: AuditLogModel }) {
  if (!model.rows.length) return <EmptyState title={model.emptyLabel} />;
  return (
    <>
      {model.rows.map((row) => (
        <article className="audit-row react-audit-row" key={row.id}>
          <div className="react-audit-head">
            <b>{row.action}</b>
            <span className="muted">{row.date}</span>
          </div>
          {row.context ? <div className="audit-context">{row.context}</div> : null}
          {row.json ? (
            <details className="audit-details">
              <summary>Технические детали</summary>
              <pre>{formatAuditDetails(row.json)}</pre>
            </details>
          ) : null}
        </article>
      ))}
    </>
  );
}
