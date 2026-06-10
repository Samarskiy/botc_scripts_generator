import { useState } from 'react';
import type { FormEvent } from 'react';
import type { GenerateRequest, Edition, Complexity } from '@botc/shared';
import type { RoleLite } from '../lib/api.js';
import { RoleSelect } from './RoleSelect.js';

const EDITIONS: { id: Edition; label: string }[] = [
  { id: 'tb', label: 'Trouble Brewing' },
  { id: 'bmr', label: 'Bad Moon Rising' },
  { id: 'snv', label: 'Sects & Violets' },
  { id: 'experimental', label: 'Experimental' },
];

const COMPLEXITIES: { id: Complexity; label: string }[] = [
  { id: 'simple', label: 'Простий (для новачків)' },
  { id: 'medium', label: 'Середній' },
  { id: 'complex', label: 'Складний (для досвідчених)' },
];

interface Props {
  roles: RoleLite[];
  busy: boolean;
  onSubmit: (r: GenerateRequest) => void;
  initial?: Partial<GenerateRequest>;
}

export function ConceptForm({ roles, busy, onSubmit, initial }: Props) {
  const [concept, setConcept] = useState(initial?.concept ?? '');
  const [min, setMin] = useState(initial?.players?.min ?? 7);
  const [max, setMax] = useState(initial?.players?.max ?? 12);
  const [complexity, setComplexity] = useState<Complexity>(initial?.complexity ?? 'medium');
  const [editions, setEditions] = useState<Edition[]>(initial?.editions ?? ['tb', 'bmr', 'snv']);
  const [mustInclude, setMustInclude] = useState<string[]>(initial?.mustInclude ?? []);
  const [exclude, setExclude] = useState<string[]>(initial?.exclude ?? []);

  const toggleEdition = (e: Edition) =>
    setEditions((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));

  const valid =
    concept.trim().length > 0 && editions.length > 0 && min >= 5 && max <= 20 && min <= max;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    onSubmit({
      concept: concept.trim(),
      players: { min, max },
      complexity,
      editions,
      includeHomebrew: false,
      mustInclude,
      exclude,
      homebrew: [],
    });
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h2>Новий скрипт</h2>

      <div className="fld">
        <label>Концепт / тема</label>
        <textarea
          className="inp area"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="«Хорор про відьом: багато дезінформації, Демона важко знайти»"
          rows={3}
        />
      </div>

      <div className="row">
        <div className="fld">
          <label>Гравців (мін)</label>
          <input
            className="inp"
            type="number"
            min={5}
            max={20}
            value={min}
            onChange={(e) => setMin(Number(e.target.value))}
          />
        </div>
        <div className="fld">
          <label>Гравців (макс)</label>
          <input
            className="inp"
            type="number"
            min={5}
            max={20}
            value={max}
            onChange={(e) => setMax(Number(e.target.value))}
          />
        </div>
        <div className="fld">
          <label>Складність</label>
          <select
            className="inp"
            value={complexity}
            onChange={(e) => setComplexity(e.target.value as Complexity)}
          >
            {COMPLEXITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="fld">
        <label>Видання у пулі</label>
        <div className="checks">
          {EDITIONS.map((e) => (
            <label key={e.id} className={`check ${editions.includes(e.id) ? 'on' : ''}`}>
              <input
                type="checkbox"
                checked={editions.includes(e.id)}
                onChange={() => toggleEdition(e.id)}
              />
              {e.label}
            </label>
          ))}
        </div>
      </div>

      <RoleSelect roles={roles} value={mustInclude} onChange={setMustInclude} label="Обов'язково включити" accent="on" />
      <RoleSelect roles={roles} value={exclude} onChange={setExclude} label="Виключити" accent="ex" />

      <button className="btn primary" type="submit" disabled={!valid || busy}>
        ✨ Згенерувати скрипт
      </button>
      {!valid && <p className="hint">Заповніть концепт, оберіть хоча б одне видання, перевірте діапазон гравців (5–20).</p>}
    </form>
  );
}
