// @ts-nocheck
import React from 'react';
import { useReactWorkspaceModel } from './useWorkspaceStore';

export type ReactWorkspaceModel = ReturnType<typeof useReactWorkspaceModel>;

const WorkspaceStoreContext = React.createContext<ReactWorkspaceModel | null>(null);

export interface WorkspaceStoreProviderProps {
  children: React.ReactNode;
}

export function WorkspaceStoreProvider({ children }: WorkspaceStoreProviderProps) {
  const model = useReactWorkspaceModel();
  return (
    <WorkspaceStoreContext.Provider value={model}>
      {children}
    </WorkspaceStoreContext.Provider>
  );
}

export function useWorkspaceStoreContext(): ReactWorkspaceModel {
  const value = React.useContext(WorkspaceStoreContext);
  if (!value) throw new Error('useWorkspaceStoreContext must be used inside WorkspaceStoreProvider');
  return value;
}
