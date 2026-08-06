import type { ProgressEvent } from '@botc/shared';

/**
 * The engine's stages laid out around a clock face. The hand sweeps forward
 * through a pass and jumps back on refinement, so the loop is visible.
 */
const STAGES = [
  { key: 'pool', label: 'Пул' },
  { key: 'generating', label: 'Генерація' },
  { key: 'validating', label: 'Перевірка' },
  { key: 'evaluating', label: 'Оцінка' },
  { key: 'refining', label: 'Доопрацювання' },
];

const R = 68; // dial radius in viewBox units
const C = 2 * Math.PI * R;
const angleOf = (i: number) => (360 / STAGES.length) * i;
const pointAt = (deg: number, r: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: 100 + r * Math.cos(rad), y: 100 + r * Math.sin(rad) };
};

export function GenerationProgress({ events }: { events: ProgressEvent[] }) {
  const last = events[events.length - 1];
  const activeIdx = Math.max(
    0,
    STAGES.findIndex((s) => s.key === last?.stage),
  );
  const active = STAGES[activeIdx];
  const angle = angleOf(activeIdx);
  const iteration = last?.iteration ?? 0;

  // Highest stage reached this pass, so earlier marks stay lit.
  const reached = STAGES.map((_, i) => i <= activeIdx);

  return (
    <div className="card">
      <div className="clock-wrap">
        <div className="clock">
          <svg viewBox="0 0 200 200" role="img" aria-label={`Етап: ${active.label}`}>
            <defs>
              <radialGradient id="candleGlow">
                <stop offset="0%" stopColor="#e8b056" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#e8b056" stopOpacity="0" />
              </radialGradient>
            </defs>

            <circle className="dial-glow" cx="100" cy="100" r="88" />
            <circle className="dial-ring" cx="100" cy="100" r={R} />

            {/* Minute ticks — the tower face. */}
            {Array.from({ length: 60 }, (_, i) => {
              const a = i * 6;
              const outer = pointAt(a, R);
              const inner = pointAt(a, i % 5 === 0 ? R - 6 : R - 3);
              return (
                <line
                  key={i}
                  className="dial-tick"
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  opacity={i % 5 === 0 ? 0.9 : 0.45}
                />
              );
            })}

            {/* Progress arc from midnight to the current stage. */}
            <circle
              className="dial-arc"
              cx="100"
              cy="100"
              r={R}
              strokeDasharray={`${(angle / 360) * C} ${C}`}
              transform="rotate(-90 100 100)"
            />

            {STAGES.map((s, i) => {
              const p = pointAt(angleOf(i), R);
              const state = i === activeIdx ? 'active' : reached[i] ? 'done' : '';
              return (
                <circle
                  key={s.key}
                  className={`dial-mark ${state}`}
                  cx={p.x}
                  cy={p.y}
                  r={i === activeIdx ? 5 : 3.5}
                />
              );
            })}

            <g className="dial-hand-group" style={{ transform: `rotate(${angle}deg)`, transformOrigin: '100px 100px', transition: 'transform 700ms cubic-bezier(0.34,1.3,0.64,1)' }}>
              <line className="dial-hand" x1="100" y1="112" x2="100" y2="44" />
            </g>
            <circle className="dial-hub" cx="100" cy="100" r="4" />
          </svg>

          {STAGES.map((s, i) => {
            const a = ((angleOf(i) - 90) * Math.PI) / 180;
            const cos = Math.cos(a);
            const rr = 40; // percent of the box
            // Anchor labels away from the dial so they never cross the ring.
            const align =
              cos < -0.3
                ? 'translate(-100%, -50%)'
                : cos > 0.3
                  ? 'translate(0, -50%)'
                  : 'translate(-50%, -50%)';
            const state = i === activeIdx ? 'active' : reached[i] ? 'done' : '';
            return (
              <span
                key={s.key}
                className={`clock-label ${state}`}
                style={{
                  left: `${50 + rr * cos}%`,
                  top: `${50 + rr * Math.sin(a)}%`,
                  transform: align,
                }}
              >
                {s.label}
              </span>
            );
          })}
        </div>

        <p className="clock-iter">
          {iteration > 0 ? `ітерація ${iteration}` : 'перший прохід'}
        </p>
        <p className="clock-note">{last?.message ?? 'Оповідач гортає грімуар…'}</p>
      </div>
    </div>
  );
}
