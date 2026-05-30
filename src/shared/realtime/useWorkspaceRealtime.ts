import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeWorkspaceRealtimeChanges } from './realtimeEvents';
import { invalidateRealtimeChange } from './realtimeInvalidation';

export function useWorkspaceRealtimeInvalidation() {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    return subscribeWorkspaceRealtimeChanges((change) => {
      invalidateRealtimeChange(queryClient, change);
    });
  }, [queryClient]);
}
