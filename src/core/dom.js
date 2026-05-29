// @ts-check
export const $ = (id) => document.getElementById(id);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export function onReady(callback) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', callback, { once: true });
  else callback();
}

export function delegate(root, type, selector, handler, options) {
  root.addEventListener(type, (event) => {
    const target = event.target && event.target.closest ? event.target.closest(selector) : null;
    if (!target || !root.contains(target)) return;
    handler(event, target);
  }, options);
}

export function ensureStyle(id, cssText) {
  if ($(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = cssText;
  document.head.appendChild(style);
}
