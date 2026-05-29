// @ts-check

/** @typedef {import('../../types/entities.js').AppState} AppState */

const DEFAULT_COMPARE = Object.is;
const INTERNAL_KEYS = new Set(['renderTimer']);

/**
 * @template T
 * @param {T} value
 * @returns {T}
 */
function freezeSnapshot(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return /** @type {T} */ (value.slice());
  return /** @type {T} */ ({ ...value });
}

/**
 * @param {Partial<AppState> | unknown} patch
 * @returns {Partial<AppState>}
 */
function normalizePatch(patch) {
  if (!patch || typeof patch !== 'object') return {};
  return Array.isArray(patch) ? /** @type {Partial<AppState>} */ ({ items: patch }) : /** @type {Partial<AppState>} */ (patch);
}

/**
 * @typedef {Object} StoreEvent
 * @property {AppState} state
 * @property {number} version
 * @property {Record<string, unknown>} meta
 */

/**
 * @typedef {Object} AppStore
 * @property {() => AppState} getState
 * @property {() => AppState} getSnapshot
 * @property {(patch: Partial<AppState>, meta?: Record<string, unknown>) => AppState} setState
 * @property {(nextState: AppState, meta?: Record<string, unknown>) => AppState} replaceState
 * @property {(mutator: (state: AppState) => void, meta?: Record<string, unknown>) => AppState} mutate
 * @property {(listener: (event: StoreEvent) => void) => () => void} subscribe
 * @property {(selector: (state: AppState) => unknown, listener: (next: unknown, previous: unknown, event: StoreEvent) => void, compare?: (a: unknown, b: unknown) => boolean) => () => void} select
 * @property {AppState} legacyState
 * @property {number} version
 */

/**
 * @param {Partial<AppState>} [initialState]
 * @returns {AppStore}
 */
export function createAppStore(initialState = {}) {
  /** @type {AppState} */
  let state = { ...initialState };
  let version = 0;
  /** @type {Set<(event: StoreEvent) => void>} */
  const listeners = new Set();
  /** @type {Set<{selector:(state:AppState)=>unknown, listener:(next:unknown, previous:unknown, event:StoreEvent)=>void, compare:(a:unknown,b:unknown)=>boolean, current:unknown}>} */
  const selectorListeners = new Set();

  function getState() {
    return state;
  }

  function getSnapshot() {
    return freezeSnapshot(state);
  }

  /** @param {Record<string, unknown>} [meta] */
  function notify(meta = {}) {
    version += 1;
    const event = { state, version, meta };
    listeners.forEach((listener) => {
      try { listener(event); } catch (error) { console.warn('[store] listener failed', error); }
    });
    selectorListeners.forEach((item) => {
      try {
        const next = item.selector(state);
        if (!item.compare(next, item.current)) {
          const previous = item.current;
          item.current = next;
          item.listener(next, previous, event);
        }
      } catch (error) { console.warn('[store] selector listener failed', error); }
    });
    try {
      window.dispatchEvent(new CustomEvent('workspace:state-change', { detail: event }));
    } catch {}
  }

  /**
   * @param {Partial<AppState>} patch
   * @param {Record<string, unknown>} [meta]
   */
  function setState(patch, meta = {}) {
    const normalized = normalizePatch(patch);
    if (!Object.keys(normalized).length) return state;
    state = { ...state, ...normalized };
    notify({ source: 'setState', ...meta, keys: Object.keys(normalized) });
    return state;
  }

  /**
   * @param {AppState} nextState
   * @param {Record<string, unknown>} [meta]
   */
  function replaceState(nextState, meta = {}) {
    state = { ...(nextState || {}) };
    notify({ source: 'replaceState', ...meta, keys: Object.keys(state) });
    return state;
  }

  /**
   * @param {(state: AppState) => void} mutator
   * @param {Record<string, unknown>} [meta]
   */
  function mutate(mutator, meta = {}) {
    if (typeof mutator !== 'function') return state;
    mutator(state);
    notify({ source: 'mutate', ...meta });
    return state;
  }

  /** @param {(event: StoreEvent) => void} listener */
  function subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  /**
   * @param {(state: AppState) => unknown} selector
   * @param {(next: unknown, previous: unknown, event: StoreEvent) => void} listener
   * @param {(a: unknown, b: unknown) => boolean} [compare]
   */
  function select(selector, listener, compare = DEFAULT_COMPARE) {
    if (typeof selector !== 'function' || typeof listener !== 'function') return () => {};
    const item = { selector, listener, compare, current: selector(state) };
    selectorListeners.add(item);
    return () => selectorListeners.delete(item);
  }

  const legacyState = /** @type {AppState} */ (new Proxy({}, {
    get(_target, key) {
      if (key === '__isWorkspaceLegacyState') return true;
      if (key === 'toJSON') return () => state;
      return state[/** @type {keyof AppState} */ (key)];
    },
    set(_target, key, value) {
      state = { ...state, [key]: value };
      if (!INTERNAL_KEYS.has(String(key))) {
        notify({ source: 'legacy-set', keys: [String(key)] });
      }
      return true;
    },
    deleteProperty(_target, key) {
      if (!(key in state)) return true;
      const next = { ...state };
      delete next[/** @type {keyof AppState} */ (key)];
      state = next;
      notify({ source: 'legacy-delete', keys: [String(key)] });
      return true;
    },
    ownKeys() {
      return Reflect.ownKeys(state);
    },
    has(_target, key) {
      return key in state;
    },
    getOwnPropertyDescriptor(_target, key) {
      if (!(key in state)) return undefined;
      return { enumerable: true, configurable: true };
    }
  }));

  return {
    getState,
    getSnapshot,
    setState,
    replaceState,
    mutate,
    subscribe,
    select,
    legacyState,
    get version() { return version; }
  };
}

export const appStore = createAppStore();

/** @param {AppStore} [store] */
export function exposeAppStore(store = appStore) {
  Object.defineProperty(window, 'appStore', {
    configurable: true,
    get: () => store
  });
  Object.defineProperty(window, 'appState', {
    configurable: true,
    get: () => store.getState()
  });
  return store;
}
