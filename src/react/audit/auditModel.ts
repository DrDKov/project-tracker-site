export interface AuditRecordLike {
  action?: string;
  created_at?: string | null;
  entity_type?: string;
  entity_id?: string;
  payload?: unknown;
  [key: string]: unknown;
}

export interface AuditLogItemViewModel {
  id: string;
  action: string;
  date: string;
  context: string;
  json: string;
}

export interface AuditLogModel {
  rows: AuditLogItemViewModel[];
  emptyLabel: string;
}

export interface CreateAuditLogModelOptions {
  logs: AuditRecordLike[];
  dt: (value?: string | null) => string;
  logPayload: (record: AuditRecordLike) => Record<string, unknown>;
  shortJson: (value: unknown) => string;
  logContext: (record: AuditRecordLike) => string;
}

export function createAuditLogModel(options: CreateAuditLogModelOptions): AuditLogModel {
  const rows = (options.logs || []).map((record, index) => {
    const payload = options.logPayload(record);
    return {
      id: String(record.id || record.entity_id || `${record.action || 'audit'}-${record.created_at || index}`),
      action: String(record.action || 'Изменение'),
      date: options.dt(record.created_at || ''),
      context: options.logContext(record),
      json: options.shortJson(payload)
    };
  });
  return { rows, emptyLabel: 'Записей нет' };
}
