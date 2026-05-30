import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, actionLabel, onAction, icon = '∅', className = '' }: EmptyStateProps) {
  return (
    <div className={['empty', 'ds-empty-state', className].filter(Boolean).join(' ')}>
      <div className="ds-empty-icon" aria-hidden="true">{icon}</div>
      <b>{title}</b>
      {description ? <p>{description}</p> : null}
      {actionLabel && onAction ? <Button variant="secondary" size="sm" onClick={onAction}>{actionLabel}</Button> : null}
    </div>
  );
}
