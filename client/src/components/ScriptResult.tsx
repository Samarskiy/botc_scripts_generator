import { useState } from 'react';
import type { GenerateResult, Character } from '@botc/shared';
import { downloadExport } from '../lib/exportJson.js';

const TEAM_ORDER = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller', 'fabled', 'loric'];
const TEAM_LABEL: Record<string, string> = {
  townsfolk: 'Townsfolk',
  outsider: 'Outsiders',
  minion: 'Minions',
  demon: 'Demon',
  traveller: 'Travellers',
  fabled: 'Fabled',
  loric: 'Loric',
};

type Axes = GenerateResult['evaluation']['axes'];
const AXES: { key: keyof Axes; label: string }[] = [
  { key: 'infoDensity', label: 'Інфо-щільність' },
  { key: 'goodEvil', label: 'Добро / Зло' },
  { key: 'conceptFit', label: 'Відповідність задуму' },
  { key: 'redundancy', label: 'Надмірність ролей' },
  { key: 'degenerate', label: 'Вироджені комбо' },
  { key: 'jinxLoad', label: 'Навантаження джинксів' },
  { key: 'complexity', label: 'Складність' },
];

const iconSrc = (c: Character) => c.icon ?? `/api/icon/${c.id}`;
const hideImg = (e: { currentTarget: HTMLImageElement }) => {
  e.currentTarget.style.visibility = 'hidden';
};

interface Props {
  result: GenerateResult;
  busy: boolean;
  onRefine: (note: string) => void;
  onRegenerate: () => void;
}

export function ScriptResult({ result, busy, onRefine, onRegenerate }: Props) {
  const { script, evaluation, belowThreshold } = result;
  const [exporting, setExporting] = useState<'json' | 'pdf' | null>(null);

  const groups = TEAM_ORDER.map((t) => ({
    team: t,
    chars: script.characters.filter((c) => c.team === t),
  })).filter((g) => g.chars.length > 0);

  const refine = () => {
    const note = window.prompt('Що покращити? (необов’язково)') ?? '';
    onRefine(note);
  };

  const exportAs = async (format: 'json' | 'pdf') => {
    setExporting(format);
    try {
      await downloadExport(script, format);
    } catch (e) {
      alert(String(e instanceof Error ? e.message : e));
    } finally {
      setExporting(null);
    }
  };

  return (
    <>
      {/* The deliverable: a printed script sheet. */}
      <article className="sheet">
        <header className="sheet-head">
          <div>
            <p className="eyebrow">Сценарій</p>
            <h2>{script.name}</h2>
          </div>
          <div className="score-stamp">
            <span className="val">{evaluation.overall.toFixed(1)}</span>
            <span className="cap">баланс / 10</span>
          </div>
        </header>

        {belowThreshold && (
          <p className="warn-banner">
            Порогу балансу досягти не вдалося — це найкращий із варіантів. Спробуйте «Доопрацювати».
          </p>
        )}

        {script.conceptRationale && <p className="rationale">{script.conceptRationale}</p>}

        {groups.map((g) => (
          <section className="team" key={g.team}>
            <h3 className={`team-h th-${g.team}`}>
              {TEAM_LABEL[g.team] ?? g.team} <span className="count">· {g.chars.length}</span>
            </h3>
            <div className="roles">
              {g.chars.map((c) => (
                <div className="role" key={c.id}>
                  <img className="role-icon" src={iconSrc(c)} alt="" loading="lazy" onError={hideImg} />
                  <div>
                    <div className="role-name">{c.name}</div>
                    <div className="role-ability">{c.ability}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </article>

      {/* The app's opinion of it. */}
      <section className="card notes">
        <p className="eyebrow">Нотатки оповідача</p>

        {AXES.map((a) => {
          const v = Math.max(0, Math.min(10, evaluation.axes[a.key]));
          return (
            <div className="bar" key={a.key}>
              <span className="lbl">{a.label}</span>
              <span className="track">
                <span className="fill" style={{ width: `${v * 10}%` }} />
              </span>
              <span className="num">{v.toFixed(0)}</span>
            </div>
          );
        })}

        {evaluation.critique && <p className="critique">{evaluation.critique}</p>}

        {evaluation.suggestedSwaps.length > 0 && (
          <ul className="swaps">
            {evaluation.suggestedSwaps.map((s, i) => (
              <li key={i}>
                <b>{s.out}</b> → <b>{s.in}</b> — {s.why}
              </li>
            ))}
          </ul>
        )}

        <div className="actions">
          <button className="btn" onClick={() => exportAs('json')} disabled={exporting !== null}>
            {exporting === 'json' ? 'Готуємо…' : '⬇ JSON'}
          </button>
          <button className="btn" onClick={() => exportAs('pdf')} disabled={exporting !== null}>
            {exporting === 'pdf' ? 'Готуємо PDF…' : '⬇ PDF'}
          </button>
          <button className="btn ghost" onClick={refine} disabled={busy}>
            ↻ Доопрацювати
          </button>
          <button className="btn ghost" onClick={onRegenerate} disabled={busy}>
            ⇄ Інший варіант
          </button>
        </div>
      </section>
    </>
  );
}
