import React from 'react';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = 'neutral', className = '', ...props }: BadgeProps) {
  const classes = ['badge', `ds-badge ds-badge-${tone}`, className].filter(Boolean).join(' ');
  return <span className={classes} {...props} />;
}
