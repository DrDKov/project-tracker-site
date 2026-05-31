// @ts-nocheck
import React from 'react';
import { TaskCardContent } from './TaskCard.tsx';

/** @typedef {import('./taskBoardModel.ts').TaskBoardViewModel} TaskBoardViewModel */
/** @typedef {import('./taskBoardModel.ts').TaskBoardColumn} TaskBoardColumn */
/** @typedef {import('./taskCardModel.ts').TaskCardViewModel} TaskCardViewModel */
/** @typedef {import('./TaskCard.tsx').TaskCardActions} TaskCardActions */
/** @typedef {TaskCardActions & { openTaskOnDate?: (date: string) => void | Promise<unknown> }} TaskBoardActions */

function actionSignature(actions = {}) {
  return [
    actions.openTask,
    actions.deleteTask,
    actions.toggleTask,
    actions.toggleTaskFavorite,
    actions.addSubtask,
    actions.toggleSubtask,
    actions.deleteSubtask,
    actions.openTaskOnDate
  ];
}

function sameActions(prev = {}, next = {}) {
  const a = actionSignature(prev);
  const b = actionSignature(next);
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

function sameCard(prev, next) {
  return prev?.id === next?.id && prev?.renderSignature === next?.renderSignature;
}

function columnSignature(column) {
  return [
    column?.id || '',
    column?.title || '',
    column?.className || '',
    column?.data?.status || '',
    column?.data?.assigneeId || '',
    column?.data?.date || '',
    ...(column?.cards || []).map((card) => `${card.id}:${card.renderSignature || ''}`)
  ].join('§');
}

/**
 * @param {{ card: TaskCardViewModel, actions?: TaskCardActions }} props
 */
function TaskCardShellBase({ card, actions = {} }) {
  return (
    <article
      className={card.rootClassName}
      draggable="true"
      data-task-id={card.id}
      data-react-task-card-root={card.id}
      data-task-card-show-status={card.showStatus ? '1' : '0'}
      style={/** @type {React.CSSProperties} */ (card.rootStyle)}
    >
      <TaskCardContent model={card} actions={actions} />
    </article>
  );
}

const TaskCardShell = React.memo(TaskCardShellBase, (prev, next) => sameCard(prev.card, next.card) && sameActions(prev.actions, next.actions));

/**
 * @param {{ column: TaskBoardColumn, mode: string, actions?: TaskBoardActions }} props
 */
function TaskBoardColumnBase({ column, mode, actions = {} }) {
  const dataProps = column.data.status
    ? { 'data-status': column.data.status }
    : column.data.assigneeId
      ? { 'data-assignee-id': column.data.assigneeId }
      : { 'data-date': column.data.date || column.id };

  return (
    <div className={column.className} {...dataProps}>
      <h3>
        {mode === 'week' ? (
          <span className="week-date-title">
            {column.title}
            {column.id !== '__none__' ? (
              <button type="button" className="week-add-task-btn" onClick={() => actions.openTaskOnDate?.(column.id)}>+</button>
            ) : null}
          </span>
        ) : (
          <span>{column.title}</span>
        )}
        <span className={mode === 'assignee' ? 'assignee-count' : mode === 'week' ? 'week-count' : 'muted'}>{column.cards.length}</span>
      </h3>
      {column.cards.length ? column.cards.map((card) => <TaskCardShell key={`${column.id}:${card.id}`} card={card} actions={actions} />) : <div className="empty">Пусто</div>}
    </div>
  );
}

const TaskBoardColumn = React.memo(TaskBoardColumnBase, (prev, next) => {
  return prev.mode === next.mode && columnSignature(prev.column) === columnSignature(next.column) && sameActions(prev.actions, next.actions);
});

/**
 * @param {{ model: TaskBoardViewModel, actions?: TaskBoardActions }} props
 */
function TaskBoardBase({ model, actions = {} }) {
  return (
    <>
      {model.loadNote ? <div className="task-load-note">{model.loadNote}</div> : null}
      {model.columns.length ? (
        model.columns.map((column) => <TaskBoardColumn key={column.id} column={column} mode={model.mode} actions={actions} />)
      ) : (
        <div className="empty">{model.emptyLabel}</div>
      )}
    </>
  );
}

export const TaskBoard = React.memo(TaskBoardBase, (prev, next) => {
  if (prev.model === next.model && sameActions(prev.actions, next.actions)) return true;
  if (prev.model?.mode !== next.model?.mode) return false;
  if (prev.model?.loadNote !== next.model?.loadNote) return false;
  if (prev.model?.emptyLabel !== next.model?.emptyLabel) return false;
  if ((prev.model?.columns || []).length !== (next.model?.columns || []).length) return false;
  return sameActions(prev.actions, next.actions) && (prev.model?.columns || []).every((column, index) => columnSignature(column) === columnSignature((next.model?.columns || [])[index]));
});
