// @ts-nocheck
import React from 'react';
import type { AppState } from '../../types/entities';
import {
  createReactWorkspaceModel,
  createWorkspaceActionModel,
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace
} from './workspaceStoreAdapter.ts';

export function useWorkspaceState(): AppState {
  return React.useSyncExternalStore(subscribeWorkspace, getWorkspaceSnapshot, getServerWorkspaceSnapshot);
}

export function useWorkspaceSelector<T>(selector: (state: AppState) => T, deps: React.DependencyList = []): T {
  const state = useWorkspaceState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(() => selector(state), [state, selector, ...deps]);
}

export function useWorkspaceActions() {
  return React.useMemo(() => createWorkspaceActionModel(), []);
}

export function useReactWorkspaceModel() {
  const state = useWorkspaceState();
  return React.useMemo(() => createReactWorkspaceModel(state), [state]);
}
