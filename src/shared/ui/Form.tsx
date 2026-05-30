import React from 'react';

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, hint, error, children, className = '' }: FieldProps) {
  return (
    <label className={['ds-field', className].filter(Boolean).join(' ')}>
      {label ? <span className="ds-field-label">{label}</span> : null}
      {children}
      {hint ? <small className="ds-field-hint">{hint}</small> : null}
      {error ? <small className="ds-field-error">{error}</small> : null}
    </label>
  );
}

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
export function Input({ className = '', ...props }: InputProps) {
  return <input className={['input', 'ds-input', className].filter(Boolean).join(' ')} {...props} />;
}

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;
export function Select({ className = '', ...props }: SelectProps) {
  return <select className={['input', 'ds-select', className].filter(Boolean).join(' ')} {...props} />;
}

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;
export function Textarea({ className = '', ...props }: TextareaProps) {
  return <textarea className={['input', 'ds-textarea', className].filter(Boolean).join(' ')} {...props} />;
}
