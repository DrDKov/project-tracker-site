import { Card } from '../../shared/ui';

export function PwaOfflineBanner({ online }: { online: boolean }) {
  if (online) return null;
  return (
    <Card className="pwa-banner pwa-offline-banner" role="status" aria-live="polite">
      <div>
        <strong>Нет соединения</strong>
        <p>Открыта локальная оболочка приложения. Данные Supabase обновятся после восстановления сети.</p>
      </div>
    </Card>
  );
}
