// @ts-nocheck
import React from 'react';

function TimelineEvent({ event, actions = {} }) {
  const open = () => actions.openTask && actions.openTask(event.taskId);
  if (event.allDay) {
    return <div className="timeline-event all-day" onClick={open}>{event.title} <em>без времени</em></div>;
  }
  return (
    <div className={`timeline-event timed ${event.autoPlaced ? 'untimed-auto ' : ''}${event.done ? 'done ' : ''}`} style={event.style} onClick={open}>
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

function TimelineDay({ day, hours, actions = {} }) {
  return (
    <div className={`timeline-day-col ${day.today ? 'today' : ''}`}>
      <div className="timeline-all-day-cell">
        {day.allDayEvents.map((event) => <TimelineEvent key={event.id} event={event} actions={actions} />)}
        {day.overflowCount ? <span className="muted">+{day.overflowCount}</span> : null}
      </div>
      <div className="timeline-time-grid" data-date={day.date}>
        {hours.slice(0, -1).map((hour) => (
          <React.Fragment key={hour.hour}>
            <div className="timeline-hour-line" style={{ top: `${hour.top}px` }} />
            <div className="timeline-half-hour-line" style={{ top: `${hour.top + 30 * 1.1}px` }} />
          </React.Fragment>
        ))}
        {day.nowTop != null ? <div className="timeline-now-line" style={{ top: `${day.nowTop}px` }} /> : null}
        {day.timedEvents.map((event) => <TimelineEvent key={event.id} event={event} actions={actions} />)}
      </div>
    </div>
  );
}

export function TimelinePage({ model, actions = {} }) {
  return (
    <div className="timeline-calendar react-timeline-calendar">
      <div className="timeline-calendar-grid" style={{ '--grid-height': `${model.gridHeight}px` }}>
        <div className="timeline-time-head" />
        {model.days.map((day) => (
          <div key={`${day.date}:head`} className={`timeline-calendar-day-head ${day.today ? 'today' : ''}`}>
            <b>{day.label}</b>
            <button className="week-add-task-btn" type="button" onClick={() => actions.openTaskOnDate && actions.openTaskOnDate(day.date)}>+</button>
          </div>
        ))}
        <div className="timeline-time-col">
          <div className="timeline-all-day-label">Без времени</div>
          {model.hourLabels.map((hour) => <div key={hour.hour} className="timeline-hour-label" style={{ top: `${hour.labelTop}px` }}>{hour.label}</div>)}
        </div>
        {model.days.map((day) => <TimelineDay key={day.date} day={day} hours={model.hourLabels} actions={actions} />)}
      </div>
    </div>
  );
}
