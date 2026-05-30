// @ts-nocheck
import React from 'react';
import { Button } from '../../shared/ui';

/** @typedef {import('./appShellModel.ts').createAppShellModel extends (...args: any) => infer R ? R : never} AppShellModel */

/**
 * @param {{ page: { id: string, icon: string, label: string }, active: boolean, onSelect: (view: string) => void }} props
 */
function NavButton({ page, active, onSelect }) {
  return (
    <Button
      className={active ? 'active' : ''}
      data-view={page.id}
      variant={active ? 'primary' : 'plain'}
      onClick={() => onSelect(page.id)}
    >
      <span aria-hidden="true">{page.icon}</span>
      <span>{page.label}</span>
    </Button>
  );
}

/**
 * @param {{ model: AppShellModel, onSelectView: (view: string) => void }} props
 */
export function AppSidebar({ model, onSelectView }) {
  return (
    <>
      <div className="brand react-app-brand">
        <div className="logo">{model.brand.logo}</div>
        <div>
          <h1>{model.brand.title}</h1>
          <p>{model.brand.subtitle}</p>
        </div>
      </div>
      <nav className="nav react-app-nav" aria-label="Основная навигация">
        {model.pages.map((page) => (
          <NavButton key={page.id} page={page} active={model.view === page.id} onSelect={onSelectView} />
        ))}
      </nav>
      <div className="side-footer react-side-footer">
        <b id="sideStatusTitle">{model.statusTitle}</b>
        <br />
        <span id="sideStatusText">{model.statusText}</span>
      </div>
    </>
  );
}

export function AppTopbar(props) {
  const {
    model,
    onRefresh,
    onOpenSettings,
    onCreateProject,
    onCreateTask,
    onOpenNotifications = () => undefined
  } = props;
  const count = Number(model.metrics?.notifications || 0);
  return (
    <>
      <div className="react-topbar-title">
        <h2 id="pageTitle">{model.title}</h2>
        <p id="pageSubtitle">{model.subtitle}</p>
      </div>
      <div className="top-actions react-top-actions">
        <Button variant="secondary" id="refreshBtn" onClick={onRefresh}>Обновить</Button>
        <Button variant="secondary" id="openSettingsBtn" onClick={onOpenSettings}>Настройки</Button>
        <Button variant="secondary" id="notificationBellBtn" className={count ? 'has-unread' : ''} onClick={onOpenNotifications} title="Оповещения">
          🔔{count ? <span className="notification-count">{count}</span> : null}
        </Button>
        <Button variant="blue" id="quickProjectBtn" onClick={onCreateProject}>+ Проект</Button>
        <Button variant="primary" id="quickTaskBtn" onClick={onCreateTask}>+ Задача</Button>
      </div>
    </>
  );
}
