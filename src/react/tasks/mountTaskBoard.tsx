// @ts-nocheck
import React from 'react';
import { renderReactIsland } from '../core/createReactIsland.tsx';
import { TaskBoard } from './TaskBoard.tsx';

/** @typedef {import('./taskBoardModel.ts').TaskBoardViewModel} TaskBoardViewModel */
/** @typedef {import('./TaskBoard.tsx').TaskBoardActions} TaskBoardActions */

/**
 * @param {HTMLElement | null} container
 * @param {TaskBoardViewModel} model
 * @param {TaskBoardActions} [actions]
 */
export function mountTaskBoard(container, model, actions = {}) {
  if (!container) return null;
  container.className = model.className;
  if (model.dataMode) container.dataset.taskMode = model.dataMode;
  else delete container.dataset.taskMode;
  return renderReactIsland(container, <TaskBoard model={model} actions={actions} />);
}
