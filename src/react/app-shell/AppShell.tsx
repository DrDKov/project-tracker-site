// @ts-nocheck
import React from 'react';
import { Button } from '../../shared/ui';

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

function primaryRouteAction(model, onCreateProject, onCreateTask) {
  const view = model?.view;
  if (view === 'projects') return <Button variant="blue" id="quickProjectBtn" onClick={onCreateProject}>+ Проект</Button>;
  if (view === 'tasks' || view === 'timeline') return <Button variant="primary" id="quickTaskBtn" onClick={onCreateTask}>+ Задача</Button>;
  return null;
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
  const count = Number(model.notificationCount || 0);
  const primaryAction = primaryRouteAction(model, onCreateProject, onCreateTask);
  return (
    <>
      <div className="react-topbar-title">
        <h2 id="pageTitle">{model.title}</h2>
        <p id="pageSubtitle">{model.subtitle}</p>
      </div>
      <div className="top-actions react-top-actions">
        <Button variant="secondary" id="notificationBellBtn" className={count ? 'has-unread' : ''} onClick={onOpenNotifications} title="Оповещения" aria-label={`Оповещения: ${count}`}>
          <span aria-hidden="true" className="notification-bell-icon">🔔</span>{count ? <span className="notification-count">{count}</span> : null}
        </Button>
        {primaryAction}
        <details className="react-topbar-more">
          <summary className="btn secondary" aria-label="Дополнительные действия">⋯</summary>
          <div className="react-topbar-menu">
            <button type="button" onClick={onRefresh}>Обновить</button>
            <button type="button" onClick={onOpenSettings}>Настройки</button>
            {model.view !== 'projects' ? <button type="button" onClick={onCreateProject}>+ Проект</button> : null}
            {model.view !== 'tasks' && model.view !== 'timeline' ? <button type="button" onClick={onCreateTask}>+ Задача</button> : null}
          </div>
        </details>
      </div>
    </>
  );
}
