// @ts-nocheck
import React from 'react';
import { UserCard } from './UserCard.tsx';

/** @typedef {import('./teamModel.ts').TeamPageViewModel} TeamPageViewModel */
/** @typedef {import('./UserCard.tsx').TeamActions} TeamActions */

/**
 * @param {{ model: TeamPageViewModel, actions?: TeamActions }} props
 */
export function TeamPage({ model, actions = {} }) {
  if (!model.users.length) {
    return <div className="empty react-team-empty">{model.emptyLabel}</div>;
  }

  return (
    <div className="react-team-page">
      <div className="react-team-summary" aria-live="polite">
        <span>Пользователей: <b>{model.total}</b></span>
        <span>Активных: {model.active}</span>
        <span>Owner: {model.owners}</span>
        <span>Admin: {model.admins}</span>
        {!model.canManageUsers ? <span className="muted">Управление доступно только owner/admin</span> : null}
      </div>
      <div className="react-team-grid">
        {model.users.map((user) => <UserCard key={user.id} user={user} actions={actions} />)}
      </div>
    </div>
  );
}
