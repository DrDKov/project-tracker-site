import React from 'react';
import { Button } from './Button';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  count?: number;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
  className?: string;
}

export function Tabs<T extends string = string>({ items, activeId, onChange, ariaLabel = 'Вкладки', className = '' }: TabsProps<T>) {
  return (
    <div className={['ds-tabs', className].filter(Boolean).join(' ')} role="tablist" aria-label={ariaLabel}>
      {items.map((item) => (
        <Button
          key={item.id}
          variant={item.id === activeId ? 'primary' : 'ghost'}
          size="sm"
          role="tab"
          aria-selected={item.id === activeId}
          onClick={() => onChange(item.id)}
        >
          {item.label}{typeof item.count === 'number' ? <span className="ds-tab-count">{item.count}</span> : null}
        </Button>
      ))}
    </div>
  );
}
