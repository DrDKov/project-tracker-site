export function createTaskFavoritesFeature(deps) {
  const { toggleTaskFavorite } = deps;

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
    document.addEventListener('click', (event) => {
      const button = event.target.closest('.task-fav-btn');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      toggleTaskFavorite(button.dataset.id);
    }, true);
  }

  return { bind };
}
