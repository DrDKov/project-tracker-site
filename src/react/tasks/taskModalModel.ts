// @ts-nocheck

export const TASK_STATUS_OPTIONS = Object.freeze([
  { value: 'planned', label: 'Запланировано' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'waiting', label: 'Ожидание' },
  { value: 'done', label: 'Завершено' }
]);

export const TASK_PRIORITY_OPTIONS = Object.freeze([
  { value: 'high', label: 'Высокий' },
  { value: 'medium', label: 'Средний' },
  { value: 'low', label: 'Низкий' }
]);

export const TASK_REPEAT_OPTIONS = Object.freeze([
  { value: 'daily', label: 'Ежедневно' },
  { value: 'weekdays', label: 'По дням недели' },
  { value: 'weekly', label: 'Раз в неделю' },
  { value: 'monthly', label: 'Раз в месяц' }
]);

export const TASK_WEEKDAY_OPTIONS = Object.freeze([
  { value: '1', label: 'Пн' },
  { value: '2', label: 'Вт' },
  { value: '3', label: 'Ср' },
  { value: '4', label: 'Чт' },
  { value: '5', label: 'Пт' },
  { value: '6', label: 'Сб' },
  { value: '7', label: 'Вс' }
]);

/**
 * Creates the static TaskModal contract. The modal remains uncontrolled on
 * purpose: legacy action/realtime modules can keep reading and writing values
 * through stable DOM ids while React owns markup composition.
 */
export function createTaskModalModel() {
  return {
    title: 'Задача',
    fields: {
      title: 'Название',
      project: 'Проект',
      assignees: 'Исполнители',
      status: 'Статус',
      priority: 'Приоритет',
      start: 'Дата старта',
      due: 'Срок',
      notes: 'Описание'
    },
    statusOptions: TASK_STATUS_OPTIONS,
    priorityOptions: TASK_PRIORITY_OPTIONS,
    repeatOptions: TASK_REPEAT_OPTIONS,
    weekdayOptions: TASK_WEEKDAY_OPTIONS,
    assigneeHint: 'Можно выбрать несколько исполнителей: Ctrl/Shift + клик.',
    allDayLabel: 'Весь день / без конкретного времени',
    commentsTitle: 'Комментарии'
  };
}

/** @param {{ value: string, label: string }[]} options */
export function valuesOf(options) {
  return options.map((option) => option.value);
}
