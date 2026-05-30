import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { workspaceQueryClient } from './queryClient';

export interface WorkspaceQueryProviderProps {
  children: React.ReactNode;
}

export function WorkspaceQueryProvider({ children }: WorkspaceQueryProviderProps) {
  return (
    <QueryClientProvider client={workspaceQueryClient}>
      {children}
    </QueryClientProvider>
  );
}
