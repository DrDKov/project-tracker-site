import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceQueryKeys } from '../queries/workspaceQueryKeys';
import { createWorkspaceReactActions } from '../../actions/workspaceActions.ts';

export function useTaskMutations() {
  const queryClient = useQueryClient();
  const actions = createWorkspaceReactActions();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.tasks() });

  return {
    toggleTask: useMutation({
      mutationFn: ({ id, done }: { id: string; done: boolean }) => actions.toggleTask(id, done),
      onSettled: invalidate
    }),
    deleteTask: useMutation({
      mutationFn: (id: string) => actions.deleteTask(id),
      onSettled: invalidate
    }),
    favoriteTask: useMutation({
      mutationFn: (id: string) => actions.toggleTaskFavorite(id),
      onSettled: invalidate
    })
  };
}
