// @ts-check
import { createTaskCardViewModel, isTaskCardFavorite } from '../../react/tasks/taskCardModel.ts';

/** @typedef {import('../../types/entities.js').AppState} AppState */
/** @typedef {import('../../types/entities.js').Task} Task */
/** @typedef {import('../../types/entities.js').Subtask} Subtask */
/** @typedef {{ showStatus?: boolean }} TaskCardOptions */
/** @typedef {Record<string, any>} TaskCardViewModel */

/**
 * Stage 25 task card facade.
 *
 * React now owns TaskCard rendering. This module remains only as a typed model
 * adapter for runtime pieces that still build task board/dashboard view models.
 * It intentionally does not return HTML strings.
 *
 * @param {{
 *   S: AppState,
 *   fmt: (value?: string | null) => string,
 *   dt: (value?: string | null) => string,
 *   rgba: (hex: string | undefined | null, alpha: number) => string,
 *   pcolor: (projectId?: string | null) => string,
 *   pname: (projectId?: string | null) => string,
 *   uname: (userId?: string | null) => string,
 *   tids: (task: Task) => string[],
 *   subs: (taskId: string) => Subtask[],
 *   today: () => string,
 *   PR: Record<string, string>,
 *   ST?: Record<string, string>,
 *   taskCommentList: (taskId: string) => unknown[]
 * }} deps
 */
export function createTaskCardRenderer(deps) {
  /**
   * @param {Task} task
   * @param {TaskCardOptions} [options]
   * @returns {TaskCardViewModel}
   */
  function model(task, options = {}) {
    return createTaskCardViewModel(task, deps, options);
  }

  /** @param {Task | null | undefined} task */
  function isFavorite(task) {
    return isTaskCardFavorite(task);
  }

  return { model, isFavorite };
}
