import type { Character, GenerateRequest } from '@botc/shared';

/** Thrown when the requested constraints can't produce a valid script. */
export class InfeasibleError extends Error {}

export interface Composition {
  townsfolk: number;
  outsiders: number;
  minions: number;
  demonsMin: number;
  demonsMax: number;
}

/** Target composition for the script menu, derived from the player range. */
export function targetComposition(players: { min: number; max: number }): Composition {
  // Teensyville (small scripts) for games capped at 6 players.
  if (players.max <= 6) {
    return { townsfolk: 6, outsiders: 2, minions: 2, demonsMin: 1, demonsMax: 1 };
  }
  // Standard full script menu.
  return { townsfolk: 13, outsiders: 4, minions: 4, demonsMin: 1, demonsMax: 4 };
}

/**
 * Assemble the candidate character pool: official roles filtered by edition,
 * plus homebrew, with must-include forced in and exclude removed. Throws
 * InfeasibleError when the constraints can't yield a valid script.
 */
export function buildPool(request: GenerateRequest, roles: Character[]): Character[] {
  const all = [...roles, ...(request.includeHomebrew ? request.homebrew : [])];
  const byId = new Map(all.map((c) => [c.id, c]));

  for (const id of request.mustInclude) {
    if (!byId.has(id)) throw new InfeasibleError(`Обов'язковий персонаж не знайдений: ${id}`);
    if (request.exclude.includes(id)) {
      throw new InfeasibleError(`Персонаж одночасно обов'язковий і виключений: ${id}`);
    }
  }

  const excluded = new Set(request.exclude);
  const editions = new Set(request.editions);

  const pool = all.filter((c) => {
    if (excluded.has(c.id)) return false;
    if (c.homebrew) return request.includeHomebrew;
    return editions.has(c.edition);
  });

  // Force-include must-include characters even if filtered out by edition.
  const poolIds = new Set(pool.map((c) => c.id));
  for (const id of request.mustInclude) {
    if (!poolIds.has(id)) {
      pool.push(byId.get(id)!);
      poolIds.add(id);
    }
  }

  // Feasibility: the pool must offer enough of each team to fill the target.
  const target = targetComposition(request.players);
  const count = (team: string) => pool.filter((c) => c.team === team).length;
  if (count('demon') < target.demonsMin) throw new InfeasibleError('У пулі немає жодного Demon');
  if (count('townsfolk') < target.townsfolk) {
    throw new InfeasibleError('Замало Townsfolk у пулі для цільового складу');
  }
  if (count('outsider') < target.outsiders) throw new InfeasibleError('Замало Outsiders у пулі');
  if (count('minion') < target.minions) throw new InfeasibleError('Замало Minions у пулі');

  return pool;
}
