import React from 'react';
import { Button } from './Button';

export interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  onClose?: () => void;
}

export function ModalHeader({ title, subtitle, onClose }: ModalHeaderProps) {
  return (
    <div className="modal-head ds-modal-head">
      <div>
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {onClose ? <Button variant="ghost" size="icon" aria-label="Закрыть" onClick={onClose}>×</Button> : null}
    </div>
  );
}

export interface ModalFooterProps {
  children: React.ReactNode;
}

export function ModalFooter({ children }: ModalFooterProps) {
  return <div className="modal-actions ds-modal-footer">{children}</div>;
}
