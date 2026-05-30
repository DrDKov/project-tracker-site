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
 */

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

      <p className="muted">{project.description}</p>
      <p><b>Следующий шаг:</b> {project.nextStep}</p>
      <p className="muted">Владелец: {project.ownerName}</p>
      <p className="muted">{project.startDate} → {project.deadline}</p>

      <div className="react-project-stats" aria-label={`Задач завершено ${project.doneTasks} из ${project.totalTasks}`}>
        <span>{project.doneTasks}/{project.totalTasks} задач</span>
        <span>{project.progress}%</span>
      </div>
      <div className="progress"><i style={{ width: `${project.progress}%` }} /></div>

      <div className="actions">
        <Button size="sm" variant="secondary" onClick={() => actions.openProject?.(project.id)}>Редактировать</Button>
        <Button size="sm" variant="primary" onClick={() => actions.createTaskForProject?.(project.id)}>+ Задача</Button>
        <Button size="sm" variant="secondary" onClick={() => actions.openAccess?.(project.id)}>Участники</Button>
        <Button size="sm" variant="danger" onClick={() => actions.deleteProject?.(project.id)}>Удалить</Button>
      </div>
    </Card>
  );
}
