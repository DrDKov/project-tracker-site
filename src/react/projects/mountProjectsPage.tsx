// @ts-nocheck
import React from 'react';
import { renderReactIsland } from '../core/createReactIsland.tsx';
import { ProjectsPage } from './ProjectsPage.tsx';

/** @typedef {import('./projectModel.ts').ProjectsPageViewModel} ProjectsPageViewModel */
/** @typedef {import('./ProjectCard.tsx').ProjectCardActions} ProjectCardActions */

/**
 * @param {HTMLElement | null} container
 * @param {ProjectsPageViewModel} model
 * @param {ProjectCardActions} [actions]
 */
export function mountProjectsPage(container, model, actions = {}) {
  if (!container) return null;
  container.classList.add('react-projects-grid');
  return renderReactIsland(container, <ProjectsPage model={model} actions={actions} />);
}
