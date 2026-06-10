import { useId, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { RoleLite } from '../lib/api.js';

interface Props {
  roles: RoleLite[];
  value: string[];
  onChange: (ids: string[]) => void;
  label: string;
  accent?: 'on' | 'ex';
}

/** Add-by-name multi-select backed by a datalist; renders selected as chips. */
export function RoleSelect({ roles, value, onChange, label, accent }: Props) {
  const [text, setText] = useState('');
  const listId = useId();
  const byName = useMemo(
    () => new Map(roles.map((r) => [r.name.toLowerCase(), r.id])),
    [roles],
  );
  const nameById = useMemo(() => new Map(roles.map((r) => [r.id, r.name])), [roles]);

  const add = (name: string) => {
    const id = byName.get(name.trim().toLowerCase());
    if (id && !value.includes(id)) onChange([...value, id]);
    setText('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      add(text);
    }
  };

  return (
    <div className="fld">
      <label>{label}</label>
      <input
        className="inp"
        list={listId}
        value={text}
        placeholder="Почніть вводити назву…"
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          if (byName.has(v.toLowerCase())) add(v);
        }}
        onKeyDown={onKeyDown}
      />
      <datalist id={listId}>
        {roles
          .filter((r) => !value.includes(r.id))
          .map((r) => (
            <option key={r.id} value={r.name} />
          ))}
      </datalist>
      {value.length > 0 && (
        <div className="chips">
          {value.map((id) => (
            <span key={id} className={`chip ${accent ?? 'on'}`}>
              {nameById.get(id) ?? id}
              <button type="button" aria-label="прибрати" onClick={() => onChange(value.filter((x) => x !== id))}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
