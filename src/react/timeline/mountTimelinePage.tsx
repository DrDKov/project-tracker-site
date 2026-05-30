// @ts-nocheck
import React from 'react';
import { renderReactIsland } from '../core/createReactIsland.tsx';
import { TimelinePage } from './TimelinePage.tsx';

/** @typedef {import('./timelineModel.ts').TimelinePageModel} TimelinePageModel */

/**
 * @param {HTMLElement | null} container
 * @param {TimelinePageModel} model
 */
export function mountTimelinePage(container, model) {
  if (!container) return null;
  container.classList.add('react-timeline-root');
  return renderReactIsland(container, <TimelinePage model={model} />);
}
