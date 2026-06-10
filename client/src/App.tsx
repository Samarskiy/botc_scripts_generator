import { useEffect, useState } from 'react';

interface Health {
  status: string;
  hasApiKey: boolean;
  model: string;
}

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <main className="shell">
      <h1>🎲 BotC — Генератор збалансованих скриптів</h1>
      <p className="muted">Каркас проєкту (Фаза 0). Форма концепту з'явиться у Фазі 5.</p>

      <section className="card">
        <h2>Стан бекенду</h2>
        {error && <p className="error">Бекенд недоступний: {error}</p>}
        {!error && !health && <p className="muted">Перевіряємо…</p>}
        {health && (
          <ul>
            <li>Статус: <strong>{health.status}</strong></li>
            <li>Модель: <code>{health.model}</code></li>
            <li>
              API-ключ:{' '}
              {health.hasApiKey ? (
                <strong className="ok">налаштовано</strong>
              ) : (
                <strong className="warn">не задано (.env)</strong>
              )}
            </li>
          </ul>
        )}
      </section>
    </main>
  );
}
