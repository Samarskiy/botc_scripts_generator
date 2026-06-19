import { useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { RoleLite } from '../lib/api.js';

interface Props {
  roles: RoleLite[];
  value: string[];
  onChange: (ids: string[]) => void;
  label: string;
  accent?: 'on' | 'ex';
}

const iconSrc = (r: RoleLite) => r.icon ?? `/api/icon/${r.id}`;
const hideImg = (e: { currentTarget: HTMLImageElement }) => {
  e.currentTarget.style.visibility = 'hidden';
};

/** Searchable role picker: a custom dropdown showing icon + name + ability. */
export function RoleSelect({ roles, value, onChange, label, accent }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<number | undefined>(undefined);

  const byId = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);
  const selected = value.map((id) => byId.get(id)).filter((r): r is RoleLite => Boolean(r));

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const chosen = new Set(value);
    return roles
      .filter((r) => !chosen.has(r.id) && (q === '' || r.name.toLowerCase().includes(q)))
      .slice(0, 40);
  }, [roles, query, value]);

  const add = (id: string) => {
    if (!value.includes(id)) onChange([...value, id]);
    setQuery('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && matches[0]) {
      e.preventDefault();
      add(matches[0].id);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="fld">
      <label>{label}</label>
      <div className="combo">
        <input
          className="inp"
          value={query}
          placeholder="Почніть вводити назву…"
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setOpen(false), 120);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {open && matches.length > 0 && (
          <ul className="combo-list" onMouseDown={(e) => e.preventDefault()}>
            {matches.map((r) => (
              <li key={r.id} className="combo-opt" title={r.ability} onClick={() => add(r.id)}>
                <img className="opt-icon" src={iconSrc(r)} alt="" loading="lazy" onError={hideImg} />
                <span className={`opt-name th-${r.team}`}>{r.name}</span>
                <span className="opt-ability">{r.ability}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {selected.length > 0 && (
        <div className="chips">
          {selected.map((r) => (
            <span key={r.id} className={`chip ${accent ?? 'on'}`} title={r.ability}>
              <img className="chip-icon" src={iconSrc(r)} alt="" onError={hideImg} />
              {r.name}
              <button type="button" aria-label="прибрати" onClick={() => onChange(value.filter((x) => x !== r.id))}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
