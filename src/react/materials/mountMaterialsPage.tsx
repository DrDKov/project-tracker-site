// @ts-nocheck
import React from 'react';
import { renderReactIsland } from '../core/createReactIsland.tsx';
import { MaterialsPage } from './MaterialsPage.tsx';

/** @typedef {import('./materialsModel.ts').MaterialsPageModel} MaterialsPageModel */
/** @typedef {import('./MaterialsPage.tsx').MaterialsPageActions} MaterialsPageActions */

/**
 * @param {HTMLElement | null} container
 * @param {MaterialsPageModel} model
 * @param {MaterialsPageActions} actions
 */
export function mountMaterialsPage(container, model, actions) {
  if (!container) return null;
  container.classList.add('react-materials-root');
  return renderReactIsland(container, <MaterialsPage model={model} actions={actions} />);
}
