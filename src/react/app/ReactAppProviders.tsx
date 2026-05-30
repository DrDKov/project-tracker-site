// @ts-nocheck
import React from 'react';
import { WorkspaceQueryProvider } from '../../shared/query/QueryProvider';
import { WorkspaceStoreProvider } from '../state/WorkspaceStoreProvider';
import { WorkspaceDataBridge } from '../data/bridge/WorkspaceDataBridge';
import { WorkspaceRealtimeProvider } from '../../shared/realtime/WorkspaceRealtimeProvider';
import { WorkspaceRouterProvider } from '../../app/router/WorkspaceRouterProvider';

export interface ReactAppProvidersProps {
  children: React.ReactNode;
}

export function ReactAppProviders({ children }: ReactAppProvidersProps) {
  return (
    <WorkspaceRouterProvider>
      <WorkspaceQueryProvider>
        <WorkspaceStoreProvider>
          <WorkspaceRealtimeProvider>
            <WorkspaceDataBridge />
            {children}
          </WorkspaceRealtimeProvider>
        </WorkspaceStoreProvider>
      </WorkspaceQueryProvider>
    </WorkspaceRouterProvider>
  );
}
