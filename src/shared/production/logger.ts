export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ProductionLogEvent {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: unknown;
  timestamp: string;
}

const isProduction = import.meta.env.PROD;

function normalizeError(error: unknown) {
  if (!error) return undefined;
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: isProduction ? undefined : error.stack };
  }
  return { value: String(error) };
}

export function createLogEvent(level: LogLevel, message: string, context?: Record<string, unknown>, error?: unknown): ProductionLogEvent {
  return {
    level,
    message,
    context,
    error: normalizeError(error),
    timestamp: new Date().toISOString()
  };
}

export function logWorkspaceEvent(level: LogLevel, message: string, context?: Record<string, unknown>, error?: unknown): ProductionLogEvent {
  const event = createLogEvent(level, message, context, error);
  if (level === 'error') console.error('[workspace]', message, { context, error });
  else if (level === 'warn') console.warn('[workspace]', message, context || '');
  else if (!isProduction) console.log('[workspace]', level, message, context || '');
  return event;
}

export function logError(message: string, error?: unknown, context?: Record<string, unknown>): ProductionLogEvent {
  return logWorkspaceEvent('error', message, context, error);
}

export function logWarning(message: string, context?: Record<string, unknown>): ProductionLogEvent {
  return logWorkspaceEvent('warn', message, context);
}
