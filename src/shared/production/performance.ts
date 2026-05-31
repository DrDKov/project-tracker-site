import { logWarning } from './logger';

export interface PerformanceMarkResult {
  supported: boolean;
  name: string;
  startedAt: number;
}

export interface PerformanceMeasureResult {
  supported: boolean;
  name: string;
  duration: number | null;
}

export interface WorkspacePerformanceAuditEntry {
  name: string;
  duration: number;
  startedAt: number;
  endedAt: number;
  budgetMs?: number;
  meta?: Record<string, unknown>;
}

export const PERFORMANCE_BUDGETS = Object.freeze({
  appBootMs: 2500,
  routeRenderMs: 1200,
  interactionMs: 200,
  taskModelMs: 120,
  taskSaveMs: 350,
  taskModeSwitchMs: 160
});

function nowMs(): number {
  const runtime = globalThis as typeof globalThis & { performance?: Performance };
  return runtime.performance && typeof runtime.performance.now === 'function' ? runtime.performance.now() : Date.now();
}

function hasPerformanceApi(): boolean {
  return typeof performance !== 'undefined' && typeof performance.mark === 'function';
}

export function markWorkspacePerformance(name: string): PerformanceMarkResult {
  const startedAt = nowMs();
  if (!hasPerformanceApi()) return { supported: false, name, startedAt };
  performance.mark(name);
  return { supported: true, name, startedAt };
}

export function measureWorkspacePerformance(name: string, startMark: string, endMark?: string, budgetMs?: number): PerformanceMeasureResult {
  if (!hasPerformanceApi() || typeof performance.measure !== 'function') return { supported: false, name, duration: null };
  if (endMark) performance.mark(endMark);
  const measure = performance.measure(name, startMark, endMark);
  const duration = measure.duration;
  if (typeof budgetMs === 'number' && duration > budgetMs) {
    logWarning('Performance budget exceeded', { name, duration: Math.round(duration), budgetMs });
  }
  return { supported: true, name, duration };
}

export function recordWorkspacePerformanceMetric(
  name: string,
  duration: number,
  meta: Record<string, unknown> = {},
  budgetMs?: number
): WorkspacePerformanceAuditEntry {
  const endedAt = nowMs();
  const entry: WorkspacePerformanceAuditEntry = {
    name,
    duration,
    startedAt: endedAt - duration,
    endedAt,
    budgetMs,
    meta
  };
  const runtime = globalThis as typeof globalThis & {
    __workspacePerfAudit?: WorkspacePerformanceAuditEntry[];
    __workspacePerfSummary?: Record<string, { count: number; last: number; max: number; avg: number }>;
  };
  const list = Array.isArray(runtime.__workspacePerfAudit) ? runtime.__workspacePerfAudit : [];
  list.push(entry);
  runtime.__workspacePerfAudit = list.slice(-300);

  const summary = runtime.__workspacePerfSummary || {};
  const previous = summary[name] || { count: 0, last: 0, max: 0, avg: 0 };
  const count = previous.count + 1;
  summary[name] = {
    count,
    last: Math.round(duration),
    max: Math.round(Math.max(previous.max, duration)),
    avg: Math.round(((previous.avg * previous.count) + duration) / count)
  };
  runtime.__workspacePerfSummary = summary;

  if (typeof budgetMs === 'number' && duration > budgetMs) {
    logWarning('Performance audit budget exceeded', { name, duration: Math.round(duration), budgetMs, meta });
  }
  return entry;
}

export function measureWorkspaceOperation<T>(
  name: string,
  operation: () => T,
  meta: Record<string, unknown> = {},
  budgetMs?: number
): T {
  const startedAt = nowMs();
  try {
    const result = operation();
    if (result && typeof (result as Promise<unknown>).finally === 'function') {
      return (result as Promise<unknown>).finally(() => {
        recordWorkspacePerformanceMetric(name, nowMs() - startedAt, meta, budgetMs);
      }) as T;
    }
    recordWorkspacePerformanceMetric(name, nowMs() - startedAt, meta, budgetMs);
    return result;
  } catch (error) {
    recordWorkspacePerformanceMetric(name, nowMs() - startedAt, { ...meta, error: true }, budgetMs);
    throw error;
  }
}

export function createDebouncedCallback<T extends (...args: any[]) => void>(callback: T, waitMs = 120): T {
  let timer: number | undefined;
  return ((...args: Parameters<T>) => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => callback(...args), waitMs);
  }) as T;
}

export function scheduleIdleTask(callback: () => void, timeout = 1000): void {
  const win = window as typeof window & { requestIdleCallback?: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number };
  if (typeof win.requestIdleCallback === 'function') {
    win.requestIdleCallback(() => callback(), { timeout });
    return;
  }
  window.setTimeout(callback, 0);
}
