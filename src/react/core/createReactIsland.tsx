// @ts-nocheck
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ReactAppProviders } from '../app/ReactAppProviders';

/** @type {WeakMap<HTMLElement, import('react-dom/client').Root>} */
const roots = new WeakMap();

/**
 * Mounts or updates a React island in a DOM container without taking ownership
 * of the whole legacy application shell.
 *
 * @param {HTMLElement | null} container
 * @param {React.ReactElement} element
 * @returns {import('react-dom/client').Root | null}
 */
export function renderReactIsland(container, element) {
  if (!container) return null;
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(<ReactAppProviders>{element}</ReactAppProviders>);
  return root;
}

/**
 * @param {HTMLElement | null} container
 */
export function unmountReactIsland(container) {
  if (!container) return;
  const root = roots.get(container);
  if (!root) return;
  root.unmount();
  roots.delete(container);
}
