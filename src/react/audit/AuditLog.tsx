import React from 'react';
import { EmptyState, Button } from '../../shared/ui';
import type { AuditLogModel } from './auditModel';

export function AuditLog({ model }: { model: AuditLogModel }) {
  const [visibleCount, setVisibleCount] = React.useState(20);
  React.useEffect(() => setVisibleCount(20), [model.rows.length]);
  if (!model.rows.length) return <EmptyState title={model.emptyLabel} description="События появятся после изменений в workspace." />;
  const visibleRows = model.rows.slice(0, visibleCount);
  const hasMore = visibleCount < model.rows.length;
  return (
    <div className="audit-log-chunked">
      <div className="audit-log-summary">Показано {visibleRows.length} из {model.rows.length}</div>
      <div className="audit-table" role="table" aria-label="Журнал событий">
        <div className="audit-table-head" role="row">
          <span>Действие</span>
          <span>Объект</span>
          <span>Пользователь</span>
          <span>Время</span>
          <span>Сводка</span>
        </div>
        {visibleRows.map((row) => (
          <details className="audit-row react-audit-row" key={row.id}>
            <summary>
              <span className="audit-action"><b>{row.action}</b></span>
              <span className="audit-object"><b>{row.objectType}</b><em>{row.objectId}</em></span>
              <span className="audit-user">{row.user}</span>
              <span className="audit-date">{row.date || '—'}</span>
              <span className="audit-summary">{row.summary}</span>
            </summary>
            {row.json ? <pre className="audit-json">{row.json}</pre> : <div className="audit-json audit-json-empty">Нет дополнительных данных</div>}
          </details>
        ))}
      </div>
      {hasMore ? <div className="audit-more-row"><Button variant="secondary" onClick={() => setVisibleCount((count) => count + 20)}>Показать ещё 20</Button></div> : null}
    </div>
  );
}
