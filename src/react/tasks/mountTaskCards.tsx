// @ts-nocheck
import React from 'react';
import { renderReactIsland } from '../core/createReactIsland.tsx';
import { TaskCardContent } from './TaskCard.tsx';

/** @typedef {import('./taskCardModel.ts').TaskCardViewModel} TaskCardViewModel */
/** @typedef {import('./TaskCard.tsx').TaskCardActions} TaskCardActions */

/**
 * @param {{
 *   scope?: ParentNode,
 *   getModel: (taskId: string, root: HTMLElement) => TaskCardViewModel | null,
 *   actions?: TaskCardActions
 * }} options
 */
export function mountTaskCardRoots({ scope = document, getModel, actions = {} }) {
  const roots = Array.from(scope.querySelectorAll('[data-react-task-card-root]'));
  roots.forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const taskId = node.dataset.taskId || node.dataset.reactTaskCardRoot || '';
    const model = getModel(taskId, node);
    if (!model) return;
    node.className = model.rootClassName;
    Object.entries(model.rootStyle).forEach(([key, value]) => node.style.setProperty(key, value));
    renderReactIsland(node, <TaskCardContent model={model} actions={actions} />);
  });
}
