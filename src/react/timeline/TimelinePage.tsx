// @ts-nocheck
import React from 'react';

/** @typedef {import('./timelineModel.ts').TimelinePageModel} TimelinePageModel */
/** @typedef {import('./timelineModel.ts').TimelineEventModel} TimelineEventModel */
/** @typedef {import('./timelineModel.ts').TimelineDayModel} TimelineDayModel */

/**
 * @param {{ options: Array<{value:string,label:string}>, id: string, defaultValue?: string }} props
 */
function Select({ options, id, defaultValue = 'all' }) {
  return (
    <select className="input" id={id} defaultValue={defaultValue}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

/** @param {{ event: TimelineEventModel }} props */
function TimelineEvent({ event }) {
  if (event.allDay) {
    return (
      <div className="timeline-event all-day" data-action="tl-open" data-id={event.taskId}>
        {event.title} <em>без времени</em>
      </div>
    );
  }
  return (
    <div
      className={`timeline-event timed ${event.autoPlaced ? 'untimed-auto ' : ''}${event.done ? 'done ' : ''}`}
      style={/** @type {React.CSSProperties} */ (event.style)}
      data-action="tl-open"
      data-id={event.taskId}
    >
      <div>
        {event.timeLabel ? <><b>{event.timeLabel}</b>{' '}</> : null}
        {event.favorite ? '★ ' : ''}
        {event.recurring ? '↻ ' : ''}
        {event.title}
        <small>{event.projectName}</small>
      </div>
      {event.autoPlaced ? <em>без времени</em> : null}
    </div>
  );
}

/** @param {{ day: TimelineDayModel, hours: TimelinePageModel['hourLabels'] }} props */
function TimelineDay({ day, hours }) {
  return (
    <div className={`timeline-day-col ${day.today ? 'today' : ''}`}>
      <div className="timeline-all-day-cell">
        {day.allDayEvents.map((event) => <TimelineEvent key={event.id} event={event} />)}
        {day.overflowCount ? <span className="muted">+{day.overflowCount}</span> : null}
      </div>
      <div className="timeline-time-grid" data-action="tl-empty" data-date={day.date}>
        {hours.slice(0, -1).map((hour) => (
          <React.Fragment key={hour.hour}>
            <div className="timeline-hour-line" style={{ top: `${hour.top}px` }} />
            <div className="timeline-half-hour-line" style={{ top: `${hour.top + 30 * 1.1}px` }} />
          </React.Fragment>
        ))}
        {day.nowTop != null ? <div className="timeline-now-line" style={{ top: `${day.nowTop}px` }} /> : null}
        {day.timedEvents.map((event) => <TimelineEvent key={event.id} event={event} />)}
      </div>
    </div>
  );
}

/** @param {{ model: TimelinePageModel }} props */
export function TimelinePage({ model }) {
  return (
    <div className="timeline-calendar react-timeline-calendar">
      <div className="timeline-calendar-toolbar">
        <button className="btn sm secondary" type="button" data-action="tl-prev">←</button>
        <button className="btn sm secondary" type="button" data-action="tl-next">→</button>
        <button className="btn sm secondary" type="button" data-action="tl-today">Сегодня</button>
        <b>{model.weekLabel}</b>
        <input className="input" id="tlQ" placeholder="Поиск" defaultValue={model.filters.query || ''} />
        <Select id="tlP" options={model.projectOptions} defaultValue={model.filters.projectId || 'all'} />
        <Select id="tlU" options={model.userOptions} defaultValue={model.filters.userId || 'all'} />
        <Select id="tlS" options={model.statusOptions} defaultValue={model.filters.status || 'all'} />
        <Select id="tlR" options={model.priorityOptions} defaultValue={model.filters.priority || 'all'} />
        <label className="tl-check"><input type="checkbox" id="tlDone" defaultChecked={Boolean(model.filters.showDone)} /> Выполненные</label>
      </div>
      <div className="timeline-calendar-grid" style={/** @type {React.CSSProperties} */ ({ '--grid-height': `${model.gridHeight}px` })}>
        <div className="timeline-time-head" />
        {model.days.map((day) => (
          <div key={`${day.date}:head`} className={`timeline-calendar-day-head ${day.today ? 'today' : ''}`}>
            <b>{day.label}</b>
            <button className="week-add-task-btn" type="button" data-action="tl-add-day" data-date={day.date}>+</button>
          </div>
        ))}
        <div className="timeline-time-col">
          <div className="timeline-all-day-label">Без времени</div>
          {model.hourLabels.map((hour) => <div key={hour.hour} className="timeline-hour-label" style={{ top: `${hour.labelTop}px` }}>{hour.label}</div>)}
        </div>
        {model.days.map((day) => <TimelineDay key={day.date} day={day} hours={model.hourLabels} />)}
      </div>
    </div>
  );
}
