# React task islands

Stage 3 migrates task card presentation to React without taking over the whole task board.

Boundary:

- `taskCardModel.ts` contains pure data mapping from legacy task state to a React view model.
- `TaskCard.tsx` renders only the task card content.
- `mountTaskCards.tsx` mounts React into existing `.task-card` shells.
- The legacy board still controls filtering, columns, drag/drop, task ordering and modals.

This keeps current business behavior stable while removing task-card HTML string ownership from the legacy renderer.

## Stage 4: TaskModal

Stage 4 adds a React island for the task modal:

- `taskModalModel.ts` contains static modal contracts and option lists.
- `TaskModal.tsx` renders the existing task form with stable legacy DOM ids.
- `mountTaskModal.tsx` mounts React into the existing `#taskForm` without replacing the form element itself.

The modal remains deliberately uncontrolled. Runtime actions, recurrence helpers, comment rendering, @mentions and Supabase save logic keep using the same ids and form submit handler. This is a migration boundary, not a full form-state rewrite.


## Stage 5: TaskBoard / TasksPage island

Stage 5 moves the task board surface to React while preserving the existing legacy integration boundary.

New files:

```text
src/react/tasks/taskBoardModel.ts
src/react/tasks/TaskBoard.tsx
src/react/tasks/mountTaskBoard.tsx
src/styles/task-board-react.css
tests/unit/task-board-model.test.mjs
```

Boundary:

- `taskBoardModel.ts` is pure and builds status, assignee and week board view models.
- `TaskBoard.tsx` renders columns and React task cards.
- `src/features/tasks/board-renderer.js` remains the integration adapter for toolbar controls, persisted view mode, filters, drag/drop, ordering, assignee changes and date moves.
- Existing task saving, modal opening, recurrence, comments, Supabase actions and global event delegation remain unchanged.

This is not a full TasksPage rewrite yet. It is a controlled board island migration.
