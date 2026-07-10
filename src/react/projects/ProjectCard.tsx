// @ts-nocheck
import React from 'react';
import { Badge, Button, Card } from '../../shared/ui';

/** @typedef {import('./projectModel.ts').ProjectCardViewModel} ProjectCardViewModel */
/**
 * @typedef {Object} ProjectCardActions
 * @property {(projectId: string) => void | Promise<unknown>} [openProject]
 * @property {(projectId: string) => void | Promise<unknown>} [createTaskForProject]
 * @property {(projectId: string) => void | Promise<unknown>} [openAccess]
 * @property {(projectId: string) => void | Promise<unknown>} [deleteProject]
 * @property {(taskId: string) => void | Promise<unknown>} [openTask]
 * @property {(taskId: string, done: boolean) => void | Promise<unknown>} [toggleTask]
 */

function ProjectTaskList({ project, actions }) {
  return (
    <section className="project-task-block" aria-label={`Задачи проекта ${project.name}`}>
      <div className="project-task-block-head">
        <div>
          <b>Задачи</b>
          <span>{project.doneTasks}/{project.totalTasks} · {project.progress}%</span>
        </div>
        <Button size="sm" variant="primary" onClick={() => actions.createTaskForProject?.(project.id)}>+ Задача</Button>
      </div>

      {project.tasks.length ? (
        <div className="project-task-list">
          {project.tasks.map((task) => (
            <div className={`project-task-row ${task.isDone ? 'done' : ''}`} key={task.id}>
              <label className="project-task-toggle" title={task.isDone ? 'Вернуть в работу' : 'Завершить задачу'}>
                <input
                  type="checkbox"
                  checked={task.isDone}
                  onChange={(event) => actions.toggleTask?.(task.id, event.currentTarget.checked)}
                />
                <span aria-hidden="true" />
              </label>
              <button type="button" className="project-task-title" onClick={() => actions.openTask?.(task.id)}>
                {task.title}
              </button>
              <div className="project-task-meta">
                <span className="project-task-status">{task.statusLabel}</span>
                <span>{task.dateLabel}</span>
                <span>{task.priorityLabel}</span>
              </div>
              <button type="button" className="project-task-open" aria-label={`Открыть задачу ${task.title}`} onClick={() => actions.openTask?.(task.id)}>›</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="project-task-empty">
          <span>В проекте пока нет задач.</span>
          <button type="button" onClick={() => actions.createTaskForProject?.(project.id)}>Создать первую задачу</button>
        </div>
      )}
    </section>
  );
}

/**
 * @param {{ project: ProjectCardViewModel, actions?: ProjectCardActions }} props
 */
export function ProjectCard({ project, actions = {} }) {
  return (
    <Card as="article" className={project.rootClassName} style={/** @type {React.CSSProperties} */ (project.rootStyle)} data-project-id={project.id}>
      <div className="project-title">
        <div>
          <h4>{project.name}</h4>
          <div className="row">
            <Badge>{project.statusLabel}</Badge>
            <Badge tone="accent">{project.priorityLabel}</Badge>
          </div>
        </div>
        <span className="react-project-color-dot" aria-hidden="true" style={{ background: project.color }} />
      </div>

      <div className="project-card-summary">
        <p className="muted">{project.description}</p>
        <p><b>Следующий шаг:</b> {project.nextStep}</p>
        <div className="project-card-meta">
          <span>Владелец: {project.ownerName}</span>
          <span>{project.startDate} → {project.deadline}</span>
        </div>
      </div>

      <div className="react-project-stats" aria-label={`Задач завершено ${project.doneTasks} из ${project.totalTasks}`}>
        <span>{project.doneTasks}/{project.totalTasks} задач</span>
        <span>{project.progress}%</span>
      </div>
      <div className="progress"><i style={{ width: `${project.progress}%` }} /></div>

      <ProjectTaskList project={project} actions={actions} />

      <div className="actions project-card-actions">
        <Button size="sm" variant="secondary" onClick={() => actions.openProject?.(project.id)}>Редактировать проект</Button>
        <Button size="sm" variant="secondary" onClick={() => actions.openAccess?.(project.id)}>Участники</Button>
        <Button size="sm" variant="danger" onClick={() => actions.deleteProject?.(project.id)}>Удалить</Button>
      </div>
    </Card>
  );
}
