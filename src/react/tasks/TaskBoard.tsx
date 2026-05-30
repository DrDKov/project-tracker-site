// @ts-nocheck
import React from 'react';
import { TaskCardContent } from './TaskCard.tsx';

/** @typedef {import('./taskBoardModel.ts').TaskBoardViewModel} TaskBoardViewModel */
/** @typedef {import('./taskBoardModel.ts').TaskBoardColumn} TaskBoardColumn */
/** @typedef {import('./taskCardModel.ts').TaskCardViewModel} TaskCardViewModel */
/** @typedef {import('./TaskCard.tsx').TaskCardActions} TaskCardActions */
/** @typedef {TaskCardActions & { openTaskOnDate?: (date: string) => void | Promise<unknown> }} TaskBoardActions */

/**
 * @param {{ card: TaskCardViewModel, actions?: TaskCardActions }} props
 */
function TaskCardShell({ card, actions = {} }) {
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

/**
 * @param {{ column: TaskBoardColumn, mode: string, actions?: TaskBoardActions }} props
 */
function TaskBoardColumn({ column, mode, actions = {} }) {
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

/**
 * @param {{ model: TaskBoardViewModel, actions?: TaskBoardActions }} props
 */
export function TaskBoard({ model, actions = {} }) {
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
