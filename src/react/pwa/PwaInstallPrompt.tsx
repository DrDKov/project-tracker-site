import React from 'react';
import { Button, Card } from '../../shared/ui';
import type { BeforeInstallPromptEvent } from '../../shared/pwa/pwaClient';

export interface PwaInstallPromptProps {
  promptEvent: BeforeInstallPromptEvent | null;
  standalone: boolean;
  onDismiss: () => void;
  onInstallComplete: () => void;
}

export function PwaInstallPrompt({ promptEvent, standalone, onDismiss, onInstallComplete }: PwaInstallPromptProps) {
  const [installing, setInstalling] = React.useState(false);
  if (!promptEvent || standalone) return null;

  async function install() {
    if (!promptEvent) return;
    setInstalling(true);
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') onInstallComplete();
      else onDismiss();
    } finally {
      setInstalling(false);
    }
  }

  return (
    <Card className="pwa-banner pwa-install-banner" role="status" aria-live="polite">
      <div>
        <strong>Установить Project Tracker</strong>
        <p>Добавьте приложение на главный экран, чтобы открывать его как standalone-приложение.</p>
      </div>
      <div className="pwa-banner-actions">
        <Button variant="primary" size="sm" onClick={install} disabled={installing}>{installing ? 'Открываю...' : 'Установить'}</Button>
        <Button variant="secondary" size="sm" onClick={onDismiss}>Позже</Button>
      </div>
    </Card>
  );
}
