// @ts-check

/**
 * Stage 25 access facade.
 *
 * Access list rendering is owned by the React-controlled AccessModal. This
 * facade remains only as a compatibility sync point for old controller calls
 * that still invoke renderAccess() after access mutations.
 */
export function createAccessRenderer() {
  function renderAccess() {
    window.dispatchEvent(new CustomEvent('workspace:access-sync'));
  }

  return { renderAccess };
}
