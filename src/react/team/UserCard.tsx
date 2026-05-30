// @ts-nocheck
import React from 'react';
import { Badge, Button, Card } from '../../shared/ui';

/** @typedef {import('./teamModel.ts').UserCardViewModel} UserCardViewModel */
/**
 * @typedef {Object} TeamActions
 * @property {(userId: string) => void | Promise<unknown>} [openUser]
 * @property {(userId: string) => void | Promise<unknown>} [deactivateUser]
 */

/**
 * @param {{ user: UserCardViewModel, actions?: TeamActions }} props
 */
export function UserCard({ user, actions = {} }) {
  return (
    <Card as="article" className={user.rootClassName} data-user-id={user.id}>
      <header className="react-user-card-head">
        <span className="avatar avatar-lg react-user-avatar" aria-hidden="true">{user.initials}</span>
        <div className="react-user-main">
          <div className="react-user-title-row">
            <h4>{user.displayName}</h4>
            {user.currentUser ? <Badge tone="info" className="react-user-chip current">Это вы</Badge> : null}
            {!user.active ? <Badge tone="danger" className="react-user-chip inactive">Неактивен</Badge> : null}
          </div>
          <div className="react-user-meta">
            <span className={`react-user-role ${user.role}`}>{user.roleLabel}</span>
            {user.position ? <span>{user.position}</span> : null}
            {user.email ? <span>{user.email}</span> : null}
          </div>
        </div>
      </header>

      <section className="react-user-permissions" aria-label="Права пользователя">
        <div className="react-user-stat">
          <b>{user.totalProjectsCount}</b>
          <span>проектов</span>
        </div>
        <div className="react-user-stat">
          <b>{user.ownedProjectsCount}</b>
          <span>владелец</span>
        </div>
        <div className="react-user-stat">
          <b>{user.memberProjectsCount}</b>
          <span>участник</span>
        </div>
      </section>

      <div className="react-user-projects">
        {user.projects.length ? (
          user.projects.slice(0, 5).map((project) => (
            <span className={`react-user-project ${project.owned ? 'owned' : ''}`} key={project.id} title={`${project.name} · ${project.roleLabel}`}>
              {project.name}
              <em>{project.roleLabel}</em>
            </span>
          ))
        ) : (
          <span className="muted">Нет доступов к проектам</span>
        )}
        {user.projects.length > 5 ? <span className="react-user-project more">+{user.projects.length - 5}</span> : null}
      </div>

      {user.canManage ? (
        <footer className="actions react-user-actions">
          {user.canEdit ? <Button size="sm" variant="secondary" onClick={() => actions.openUser?.(user.id)}>Редактировать</Button> : null}
          {user.canDeactivate ? <Button size="sm" variant="danger" onClick={() => actions.deactivateUser?.(user.id)}>Деактивировать</Button> : null}
        </footer>
      ) : null}
    </Card>
  );
}
