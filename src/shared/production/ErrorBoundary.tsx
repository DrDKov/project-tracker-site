import React from 'react';
import { Button, Card } from '../ui';
import { logError } from './logger';

export interface AppErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
}

export interface AppErrorBoundaryState {
  error: Error | null;
  errorId: string | null;
}

function createErrorId(): string {
  return `err-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null, errorId: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error, errorId: createErrorId() };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logError('React render boundary caught an error', error, { componentStack: info.componentStack, errorId: this.state.errorId });
  }

  reset = (): void => {
    this.setState({ error: null, errorId: null });
  };

  render(): React.ReactNode {
    const { error, errorId } = this.state;
    if (!error) return this.props.children;
    return (
      <main className="app-error-shell" role="alert">
        <Card className="app-error-card">
          <h1>{this.props.fallbackTitle || 'Не удалось отрисовать интерфейс'}</h1>
          <p className="muted">Приложение перехватило ошибку в UI и не остановило всю страницу.</p>
          <p className="muted">Код события: {errorId}</p>
          <details>
            <summary>Техническая информация</summary>
            <pre>{error.message}</pre>
          </details>
          <div className="actions">
            <Button type="button" variant="primary" onClick={this.reset}>Повторить</Button>
            <Button type="button" variant="secondary" onClick={() => window.location.reload()}>Перезагрузить</Button>
          </div>
        </Card>
      </main>
    );
  }
}
