import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'blue' | 'danger' | 'ghost' | 'plain';
export type ButtonSize = 'sm' | 'md' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'btn primary ds-btn-primary',
  secondary: 'btn secondary ds-btn-secondary',
  blue: 'btn blue ds-btn-blue',
  danger: 'btn danger ds-btn-danger',
  ghost: 'ds-btn ds-btn-ghost',
  plain: 'ds-btn ds-btn-plain'
};

export function Button({ variant = 'secondary', size = 'md', fullWidth = false, className = '', type = 'button', ...props }: ButtonProps) {
  const classes = [VARIANT_CLASS[variant] || VARIANT_CLASS.secondary, size === 'sm' ? 'sm ds-btn-sm' : '', size === 'icon' ? 'ds-btn-icon' : '', fullWidth ? 'ds-btn-full' : '', className].filter(Boolean).join(' ');
  return <button type={type} className={classes} {...props} />;
}
