import type { Character, Team } from '@botc/shared';

const KEY = 'botc.homebrew';

export interface HomebrewInput {
  name: string;
  team: Team;
  ability: string;
  icon?: string; // optional data-URL
}

/** Teams a homebrew character can belong to (only composition-relevant ones). */
export const HOMEBREW_TEAMS: Team[] = ['townsfolk', 'outsider', 'minion', 'demon'];

export function loadHomebrew(): Character[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? (raw as Character[]) : [];
  } catch {
    return [];
  }
}

function persist(list: Character[]): Character[] {
  localStorage.setItem(KEY, JSON.stringify(list));
  return list;
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'role';

export function genId(name: string, existing: Set<string>): string {
  const base = `hb_${slug(name)}`;
  let id = base;
  let n = 1;
  while (existing.has(id)) id = `${base}${n++}`;
  return id;
}

export function validateHomebrew(input: HomebrewInput): string[] {
  const errors: string[] = [];
  if (!input.name?.trim()) errors.push('Потрібна назва');
  if (!input.team) errors.push('Потрібна команда');
  if (!input.ability?.trim()) errors.push('Потрібен текст здібності');
  return errors;
}

export function addHomebrew(input: HomebrewInput, list = loadHomebrew()): Character[] {
  const id = genId(input.name, new Set(list.map((c) => c.id)));
  const character: Character = {
    id,
    name: input.name.trim(),
    team: input.team,
    edition: 'experimental',
    ability: input.ability.trim(),
    homebrew: true,
    ...(input.icon ? { icon: input.icon } : {}),
  };
  return persist([...list, character]);
}

export function updateHomebrew(id: string, input: HomebrewInput): Character[] {
  return persist(
    loadHomebrew().map((c) =>
      c.id === id
        ? {
            ...c,
            name: input.name.trim(),
            team: input.team,
            ability: input.ability.trim(),
            icon: input.icon,
          }
        : c,
    ),
  );
}

export function removeHomebrew(id: string): Character[] {
  return persist(loadHomebrew().filter((c) => c.id !== id));
}
