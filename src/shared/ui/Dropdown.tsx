import React from 'react';
import { Button } from './Button';

export interface DropdownAction {
  id: string;
  label: string;
  danger?: boolean;
  onSelect: () => void;
}

export interface DropdownProps {
  label?: string;
  actions: DropdownAction[];
  className?: string;
}

export function Dropdown({ label = '⋯', actions, className = '' }: DropdownProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className={['ds-dropdown', open ? 'open' : '', className].filter(Boolean).join(' ')}>
      <Button variant="ghost" size="icon" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{label}</Button>
      <div className="ds-dropdown-menu" role="menu">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className={action.danger ? 'danger' : ''}
            role="menuitem"
            onClick={() => { setOpen(false); action.onSelect(); }}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
