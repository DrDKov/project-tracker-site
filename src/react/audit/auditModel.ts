export interface AuditRecordLike {
  id?: string;
  action?: string;
  created_at?: string | null;
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  actor_id?: string;
  payload?: unknown;
  [key: string]: unknown;
}

export interface AuditLogItemViewModel {
  id: string;
  action: string;
  date: string;
  objectType: string;
  objectId: string;
  user: string;
  summary: string;
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

const ACTION_LABELS: Record<string, string> = {
  insert: 'Создание',
  create: 'Создание',
  update: 'Изменение',
  delete: 'Удаление',
  soft_delete: 'Удаление',
  restore: 'Восстановление',
  login: 'Вход',
  logout: 'Выход'
};

const ENTITY_LABELS: Record<string, string> = {
  project: 'Проект',
  projects: 'Проект',
  task: 'Задача',
  tasks: 'Задача',
  task_comments: 'Комментарий',
  task_assignees: 'Исполнитель',
  material_templates: 'Шаблон',
  material_folders: 'Папка',
  material_files: 'Файл',
  user: 'Пользователь',
  users: 'Пользователь',
  app_users: 'Пользователь'
};

function shortId(value: unknown) {
  const text = String(value || '');
  if (!text) return '—';
  return text.length > 12 ? `${text.slice(0, 8)}…${text.slice(-4)}` : text;
}

function actionLabel(value: unknown) {
  const raw = String(value || 'update').toLowerCase();
  return ACTION_LABELS[raw] || String(value || 'Изменение');
}

function entityLabel(value: unknown) {
  const raw = String(value || '').toLowerCase();
  return ENTITY_LABELS[raw] || String(value || 'Объект');
}

function payloadSummary(payload: Record<string, unknown>) {
  const title = payload?.title || payload?.name || payload?.display_name || payload?.email || payload?.body || payload?.message;
  if (title) return String(title).slice(0, 160);
  const keys = Object.keys(payload || {}).filter((key) => !['id', 'created_at', 'updated_at', 'deleted_at'].includes(key));
  return keys.length ? `Изменены поля: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '…' : ''}` : 'Подробности доступны в раскрытии';
}

export function createAuditLogModel(options: CreateAuditLogModelOptions): AuditLogModel {
  const rows = (options.logs || []).map((record, index) => {
    const payload = options.logPayload(record);
    const objectType = entityLabel(record.entity_type || payload.entity_type || payload.table);
    const objectId = shortId(record.entity_id || payload.entity_id || payload.id);
    const user = shortId(record.user_id || record.actor_id || payload.user_id || payload.actor_id);
    return {
      id: String(record.id || record.entity_id || `${record.action || 'audit'}-${record.created_at || index}`),
      action: actionLabel(record.action || payload.action),
      date: options.dt(record.created_at || ''),
      objectType,
      objectId,
      user,
      summary: payloadSummary(payload),
      json: options.shortJson(payload)
    };
  });
  return { rows, emptyLabel: 'Записей журнала пока нет' };
}
