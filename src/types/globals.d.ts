import type { AppState } from './entities.js';

type SupabaseLike = any;

declare global {
  interface Window {
    __WORKSPACE_SUPABASE_URL__?: string;
    __WORKSPACE_SUPABASE_KEY__?: string;
    supabase?: {
      createClient: (url: string, key: string, options?: Record<string, unknown>) => SupabaseLike;
    };
    sb?: SupabaseLike;
    appStore?: {
      getState: () => AppState;
      getSnapshot: () => AppState;
      setState: (patch: Partial<AppState>, meta?: Record<string, unknown>) => AppState;
      replaceState: (nextState: AppState, meta?: Record<string, unknown>) => AppState;
      mutate: (mutator: (state: AppState) => void, meta?: Record<string, unknown>) => AppState;
      subscribe: (listener: (event: { state: AppState; version: number; meta: Record<string, unknown> }) => void) => () => void;
      select: (selector: (state: AppState) => unknown, listener: (...args: any[]) => void, compare?: (a: unknown, b: unknown) => boolean) => () => void;
      legacyState: AppState;
      readonly version: number;
    };
    appState?: AppState;
    __WorkspaceApp?: Record<string, any>;
    tasks?: any[];
    projects?: any[];
    users?: any[];
    currentProfile?: any;
    currentAuth?: any;
  }
}

export {};
