import { useState } from 'react';
import type { ChangeEvent } from 'react';
import type { Character, Team } from '@botc/shared';
import {
  HOMEBREW_TEAMS,
  addHomebrew,
  updateHomebrew,
  removeHomebrew,
  validateHomebrew,
  type HomebrewInput,
} from '../lib/homebrew.js';

const TEAM_LABEL: Record<string, string> = {
  townsfolk: 'Townsfolk',
  outsider: 'Outsider',
  minion: 'Minion',
  demon: 'Demon',
};

const EMPTY: HomebrewInput = { name: '', team: 'townsfolk', ability: '', icon: undefined };

interface Props {
  homebrew: Character[];
  onChange: (list: Character[]) => void;
  onBack: () => void;
}

export function HomebrewManager({ homebrew, onChange, onBack }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<HomebrewInput>(EMPTY);
  const [errors, setErrors] = useState<string[]>([]);

  const reset = () => {
    setEditingId(null);
    setDraft(EMPTY);
    setErrors([]);
  };

  const startEdit = (c: Character) => {
    setEditingId(c.id);
    setDraft({ name: c.name, team: c.team, ability: c.ability, icon: c.icon });
    setErrors([]);
  };

  const onIcon = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDraft((d) => ({ ...d, icon: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const submit = () => {
    const errs = validateHomebrew(draft);
    if (errs.length) {
      setErrors(errs);
      return;
    }
    onChange(editingId ? updateHomebrew(editingId, draft) : addHomebrew(draft));
    reset();
  };

  return (
    <div className="card">
      <div className="result-head">
        <h2>Хоумбрю-ролі</h2>
        <button className="btn ghost" onClick={onBack}>
          ← До форми
        </button>
      </div>
      <p className="muted">Власні персонажі зберігаються локально у браузері й беруть участь у генерації, якщо ввімкнути «хоумбрю» у формі.</p>

      <div className="fld">
        <label>{editingId ? 'Редагувати роль' : 'Нова роль'}</label>
        <input
          className="inp"
          placeholder="Назва"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </div>
      <div className="row">
        <div className="fld">
          <label>Команда</label>
          <select
            className="inp"
            value={draft.team}
            onChange={(e) => setDraft({ ...draft, team: e.target.value as Team })}
          >
            {HOMEBREW_TEAMS.map((t) => (
              <option key={t} value={t}>
                {TEAM_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="fld">
          <label>Іконка (необов'язково)</label>
          <input className="inp" type="file" accept="image/*" onChange={onIcon} />
        </div>
      </div>
      <div className="fld">
        <label>Здібність</label>
        <textarea
          className="inp area"
          rows={2}
          placeholder="Текст здібності англійською"
          value={draft.ability}
          onChange={(e) => setDraft({ ...draft, ability: e.target.value })}
        />
      </div>
      {errors.length > 0 && <p className="error">{errors.join('; ')}</p>}
      <div className="actions">
        <button className="btn primary" style={{ width: 'auto' }} onClick={submit}>
          {editingId ? 'Зберегти' : '＋ Додати'}
        </button>
        {editingId && (
          <button className="btn ghost" onClick={reset}>
            Скасувати
          </button>
        )}
      </div>

      <div className="hb-list">
        {homebrew.length === 0 && <p className="muted">Поки що немає власних ролей.</p>}
        {homebrew.map((c) => (
          <div className="hb-item" key={c.id}>
            {c.icon ? (
              <img className="hb-icon" src={c.icon} alt="" />
            ) : (
              <span className={`hb-dot th-${c.team}`} />
            )}
            <div className="hb-body">
              <strong>{c.name}</strong> <span className="muted">· {TEAM_LABEL[c.team] ?? c.team}</span>
              <div className="muted hb-ability">{c.ability}</div>
            </div>
            <div className="hb-actions">
              <button className="btn ghost" onClick={() => startEdit(c)}>
                ✎
              </button>
              <button
                className="btn ghost"
                onClick={() => onChange(removeHomebrew(c.id))}
              >
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
