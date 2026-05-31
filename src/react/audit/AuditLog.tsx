import React from 'react';
import { EmptyState, Button } from '../../shared/ui';
import type { AuditLogModel } from './auditModel';

export function AuditLog({ model }: { model: AuditLogModel }) {
  const [visibleCount, setVisibleCount] = React.useState(10);
  React.useEffect(() => setVisibleCount(10), [model.rows.length]);
  if (!model.rows.length) return <EmptyState title={model.emptyLabel} />;
  const visibleRows = model.rows.slice(0, visibleCount);
  const hasMore = visibleCount < model.rows.length;
  return (
    <div className="audit-log-chunked">
      <div className="audit-log-summary">Показано {visibleRows.length} из {model.rows.length}</div>
      {visibleRows.map((row) => (
        <article className="audit-row react-audit-row" key={row.id}>
          <b>{row.action}</b>
          <span className="muted"> · {row.date}</span>
          {row.context ? <div className="audit-context">{row.context}</div> : null}
          {row.json ? <div className="audit-json">{row.json}</div> : null}
        </article>
      ))}
      {hasMore ? <div className="audit-more-row"><Button variant="secondary" onClick={() => setVisibleCount((count) => count + 10)}>Показать ещё 10</Button></div> : null}
    </div>
  );
}
