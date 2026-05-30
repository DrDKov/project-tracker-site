// @ts-nocheck
import React from 'react';
import { createTaskModalModel } from './taskModalModel.ts';

const model = createTaskModalModel();

/**
 * TaskModalForm renders the existing task form as a React island while keeping
 * all legacy field ids and data-action hooks stable.
 */
export function TaskModalForm() {
  return (
    <>
      <div className="modal-head react-task-modal-head">
        <div>
          <h3>{model.title}</h3>
          <p className="muted react-task-modal-subtitle">Поля задачи, сроки, исполнители, повторение и комментарии.</p>
        </div>
        <button className="x" data-close="taskModal" type="button">✕</button>
      </div>

      <input id="taskId" type="hidden" />

      <div className="form-grid react-task-modal-grid">
        <label>
          <span>{model.fields.title}</span>
          <input className="input" id="taskTitle" required />
        </label>

        <label>
          <span>{model.fields.project}</span>
          <select className="input" id="taskProject" />
        </label>

        <label className="full">
          <span>{model.fields.assignees}</span>
          <select className="input multi" id="taskAssignee" multiple size={5} />
          <span className="muted">{model.assigneeHint}</span>
        </label>

        <label>
          <span>{model.fields.status}</span>
          <select className="input" id="taskStatus">
            {model.statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>

        <label>
          <span>{model.fields.priority}</span>
          <select className="input" id="taskPriority">
            {model.priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>

        <label>
          <span>{model.fields.start}</span>
          <input className="input" id="taskStart" type="date" />
        </label>

        <label>
          <span>{model.fields.due}</span>
          <input className="input" id="taskDue" type="date" />
        </label>

        <div className="full task-calendar-box">
          <label className="task-calendar-head">
            <input id="taskAllDay" type="checkbox" />
            <span>{model.allDayLabel}</span>
          </label>
          <div className="task-calendar-time-grid">
            <label>
              <span>Время начала</span>
              <input className="input" id="taskStartTime" type="time" />
            </label>
            <label>
              <span>Время окончания</span>
              <input className="input" id="taskEndTime" type="time" />
            </label>
            <label>
              <span>Длительность, мин</span>
              <input className="input" id="taskDurationMinutes" min="1" placeholder="60" step="5" type="number" />
            </label>
          </div>
        </div>

        <div className="full task-recurrence-box">
          <label className="task-recurrence-head">
            <input id="taskRepeatEnabled" type="checkbox" />
            <span>Повторяющаяся задача</span>
          </label>
          <div className="task-repeat-options hidden" id="taskRepeatOptions">
            <label>
              <span>Тип повторения</span>
              <select className="input" id="taskRepeatType">
                {model.repeatOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              <span>Повторять до</span>
              <input className="input" id="taskRepeatUntil" type="date" />
            </label>
            <div className="task-repeat-weekdays full hidden" id="taskRepeatWeekdaysBox">
              {model.weekdayOptions.map((option) => (
                <label key={option.value}>
                  <input className="task-repeat-weekday" type="checkbox" value={option.value} />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
          <div className="task-repeat-existing-note" id="taskRepeatExistingNote" />
        </div>

        <label className="full">
          <span>{model.fields.notes}</span>
          <textarea className="input textarea" id="taskNotes" placeholder="Описание задачи, контекст, детали выполнения." />
        </label>
      </div>

      <div className="task-comments-block" id="taskCommentsBlock">
        <div className="task-comments-head">
          <h4>{model.commentsTitle}</h4>
          <span className="muted">💬 <span id="taskCommentsCount">0</span></span>
        </div>
        <div className="task-comments-list" id="taskCommentsList">
          <div className="empty">Комментариев пока нет</div>
        </div>
        <div className="task-comment-form">
          <textarea className="input textarea" id="taskCommentText" placeholder="Добавить комментарий" />
          <button aria-label="Добавить комментарий" className="btn secondary task-comment-send" data-action="add-task-comment" title="Добавить комментарий" type="button">➤</button>
        </div>
      </div>

      <div className="modal-actions">
        <button className="btn secondary" data-close="taskModal" type="button">Отмена</button>
        <button className="btn primary">Сохранить</button>
      </div>
    </>
  );
}
