import { Button, Card } from '../../shared/ui';

export interface PwaUpdateBannerProps {
  visible: boolean;
  refreshing: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

export function PwaUpdateBanner({ visible, refreshing, onUpdate, onDismiss }: PwaUpdateBannerProps) {
  if (!visible) return null;
  return (
    <Card className="pwa-banner pwa-update-banner" role="status" aria-live="polite">
      <div>
        <strong>Доступно обновление</strong>
        <p>Установите новую версию приложения, чтобы получить последние исправления.</p>
      </div>
      <div className="pwa-banner-actions">
        <Button variant="primary" size="sm" onClick={onUpdate} disabled={refreshing}>{refreshing ? 'Обновляю...' : 'Обновить'}</Button>
        <Button variant="secondary" size="sm" onClick={onDismiss}>Позже</Button>
      </div>
    </Card>
  );
}
