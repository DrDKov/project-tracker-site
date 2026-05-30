import React from 'react';
import { useWorkspaceRealtimeInvalidation } from './useWorkspaceRealtime';

export function WorkspaceRealtimeProvider({ children }: { children: React.ReactNode }) {
  useWorkspaceRealtimeInvalidation();
  return <>{children}</>;
}
