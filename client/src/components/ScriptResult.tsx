import { useState } from 'react';
import type { GenerateResult } from '@botc/shared';
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
  { key: 'goodEvil', label: 'Добро/Зло' },
  { key: 'conceptFit', label: 'Відповідність концепту' },
  { key: 'redundancy', label: 'Надмірність ролей' },
  { key: 'degenerate', label: 'Вироджені комбо' },
  { key: 'jinxLoad', label: 'Навантаження джинксів' },
  { key: 'complexity', label: 'Складність' },
];

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
    <div className="card result">
      <div className="result-head">
        <h2>{script.name}</h2>
        <span className="score">{evaluation.overall.toFixed(1)} / 10</span>
      </div>
      <p className="muted">{script.conceptRationale}</p>

      {belowThreshold && (
        <p className="warn-banner">
          ⚠ Не вдалося досягти цільового балансу — показано найкращий варіант. Спробуйте «Доопрацювати».
        </p>
      )}

      {groups.map((g) => (
        <div className="team" key={g.team}>
          <div className={`team-h th-${g.team}`}>
            {TEAM_LABEL[g.team] ?? g.team} · {g.chars.length}
          </div>
          <div className="roles">
            {g.chars.map((c) => (
              <span className="role" key={c.id} title={c.ability}>
                {c.name}
              </span>
            ))}
          </div>
        </div>
      ))}

      <div className="bal">
        <h3>Розбір балансу</h3>
        {AXES.map((a) => (
          <div className="bar" key={a.key}>
            <span className="lbl">{a.label}</span>
            <span className="track">
              <span className="fill" style={{ width: `${Math.max(0, Math.min(10, evaluation.axes[a.key])) * 10}%` }} />
            </span>
            <span className="num">{evaluation.axes[a.key].toFixed(0)}</span>
          </div>
        ))}
        <p className="critique">{evaluation.critique}</p>
        {evaluation.suggestedSwaps.length > 0 && (
          <ul className="swaps">
            {evaluation.suggestedSwaps.map((s, i) => (
              <li key={i}>
                <b>{s.out}</b> → <b>{s.in}</b> — {s.why}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="actions">
        <button className="btn" onClick={() => exportAs('json')} disabled={exporting !== null}>
          {exporting === 'json' ? '…' : '⬇ JSON'}
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
    </div>
  );
}
