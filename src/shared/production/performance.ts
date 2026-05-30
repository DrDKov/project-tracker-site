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

export const PERFORMANCE_BUDGETS = Object.freeze({
  appBootMs: 2500,
  routeRenderMs: 1200,
  interactionMs: 200
});

function hasPerformanceApi(): boolean {
  return typeof performance !== 'undefined' && typeof performance.mark === 'function';
}

export function markWorkspacePerformance(name: string): PerformanceMarkResult {
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
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
