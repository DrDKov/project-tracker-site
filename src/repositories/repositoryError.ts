export type RepositoryDomain = 'tasks' | 'projects' | 'users' | 'materials' | 'chat' | 'notifications' | 'delete' | 'workspace';

export interface RepositoryErrorDetails {
  domain: RepositoryDomain | string;
  operation: string;
  cause?: unknown;
}

export class RepositoryError extends Error {
  readonly domain: RepositoryDomain | string;
  readonly operation: string;
  readonly cause?: unknown;

  constructor(message: string, details: RepositoryErrorDetails) {
    super(message);
    this.name = 'RepositoryError';
    this.domain = details.domain;
    this.operation = details.operation;
    this.cause = details.cause;
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message?: unknown }).message || 'Unknown repository error');
  return String(error || 'Unknown repository error');
}

export function normalizeRepositoryError(domain: RepositoryDomain | string, operation: string, error: unknown): RepositoryError {
  if (error instanceof RepositoryError) return error;
  return new RepositoryError(`[${domain}.${operation}] ${errorMessage(error)}`, { domain, operation, cause: error });
}

export async function repositoryCall<T>(domain: RepositoryDomain | string, operation: string, fn: () => Promise<T> | T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw normalizeRepositoryError(domain, operation, error);
  }
}

export function repositorySync<T>(domain: RepositoryDomain | string, operation: string, fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    throw normalizeRepositoryError(domain, operation, error);
  }
}

export function assertRepositoryClient(client: unknown, domain: RepositoryDomain | string): void {
  if (!client || typeof client !== 'object') {
    throw new RepositoryError(`[${domain}.client] Supabase client is not available`, { domain, operation: 'client' });
  }
}
