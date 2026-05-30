import React from 'react';
import { HashRouter } from 'react-router-dom';

export interface WorkspaceRouterProviderProps {
  children: React.ReactNode;
}

export function WorkspaceRouterProvider({ children }: WorkspaceRouterProviderProps) {
  return <HashRouter>{children}</HashRouter>;
}
