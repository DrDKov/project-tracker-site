/**
 * Stage 18: this feature no longer owns favorite clicks. React TaskCard handles
 * favorite toggles through explicit callbacks. The remaining pointer guards only
 * prevent a favorite click from starting card drag/drop in legacy shells.
 */
export function createTaskFavoritesFeature() {
  function stopFavoriteDrag(event) {
    const button = event.target.closest('.task-fav-btn');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  function bind() {
    if (window.__TASK_FAVORITES_V118__) return;
    window.__TASK_FAVORITES_V118__ = true;
    document.addEventListener('pointerdown', stopFavoriteDrag, true);
    document.addEventListener('mousedown', stopFavoriteDrag, true);
  }

  return { bind };
}
