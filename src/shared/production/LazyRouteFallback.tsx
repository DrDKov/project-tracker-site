import React from 'react';
import { Card } from '../ui';

export function LazyRouteFallback({ title = 'Загрузка раздела' }: { title?: string }) {
  return (
    <section className="panel lazy-route-fallback" aria-busy="true">
      <Card>
        <div className="lazy-route-spinner" aria-hidden="true" />
        <h3>{title}</h3>
        <p className="muted">Подготавливаем интерфейс раздела...</p>
      </Card>
    </section>
  );
}
