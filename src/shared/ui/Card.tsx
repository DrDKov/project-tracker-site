import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'article' | 'section' | 'div';
  interactive?: boolean;
}

export function Card({ as: Component = 'article', interactive = false, className = '', ...props }: CardProps) {
  const classes = ['ds-card', interactive ? 'ds-card-interactive' : '', className].filter(Boolean).join(' ');
  return <Component className={classes} {...props} />;
}
