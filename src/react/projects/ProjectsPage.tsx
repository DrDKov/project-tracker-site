// @ts-nocheck
import React from 'react';
import { ProjectCard } from './ProjectCard.tsx';

/** @typedef {import('./projectModel.ts').ProjectsPageViewModel} ProjectsPageViewModel */
/** @typedef {import('./ProjectCard.tsx').ProjectCardActions} ProjectCardActions */

/**
 * @param {{ model: ProjectsPageViewModel, actions?: ProjectCardActions }} props
 */
export function ProjectsPage({ model, actions = {} }) {
  if (!model.projects.length) {
    return <div className="empty react-projects-empty">{model.emptyLabel}</div>;
  }

  return (
    <>
      <div className="react-projects-summary" aria-live="polite">
        <span>Показано проектов: <b>{model.visible}</b></span>
        <span>Всего: {model.total}</span>
      </div>
      {model.projects.map((project) => <ProjectCard key={project.id} project={project} actions={actions} />)}
    </>
  );
}
