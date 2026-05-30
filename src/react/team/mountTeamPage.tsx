// @ts-nocheck
import React from 'react';
import { renderReactIsland } from '../core/createReactIsland.tsx';
import { TeamPage } from './TeamPage.tsx';

/** @typedef {import('./teamModel.ts').TeamPageViewModel} TeamPageViewModel */
/** @typedef {import('./UserCard.tsx').TeamActions} TeamActions */

/**
 * @param {HTMLElement | null} container
 * @param {TeamPageViewModel} model
 * @param {TeamActions} [actions]
 */
export function mountTeamPage(container, model, actions = {}) {
  if (!container) return null;
  container.classList.add('react-team-root');
  return renderReactIsland(container, <TeamPage model={model} actions={actions} />);
}
