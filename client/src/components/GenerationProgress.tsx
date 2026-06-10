import type { ProgressEvent } from '@botc/shared';

const STEPS: { key: string; label: string }[] = [
  { key: 'pool', label: 'Збір пулу' },
  { key: 'generating', label: 'Генерація' },
  { key: 'validating', label: 'Валідація' },
  { key: 'evaluating', label: 'Оцінка балансу' },
  { key: 'refining', label: 'Доопрацювання' },
];

export function GenerationProgress({ events }: { events: ProgressEvent[] }) {
  const last = events[events.length - 1];
  const activeIdx = STEPS.findIndex((s) => s.key === last?.stage);
  const iteration = last?.iteration;

  return (
    <div className="card">
      <h2>Генеруємо скрипт…</h2>
      <ol className="steps">
        {STEPS.map((s, i) => {
          const state = i < activeIdx ? 'done' : i === activeIdx ? 'active' : '';
          return (
            <li key={s.key} className={`step ${state}`}>
              <span className="dot" />
              {s.label}
            </li>
          );
        })}
      </ol>
      <p className="muted">
        {last?.message ? last.message : 'Працюємо…'}
        {typeof iteration === 'number' && iteration > 0 ? `  ·  ітерація ${iteration}` : ''}
      </p>
    </div>
  );
}
