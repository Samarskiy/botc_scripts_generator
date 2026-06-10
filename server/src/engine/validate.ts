import type { Character, GenerateRequest } from '@botc/shared';
import type { GenerationResult } from './schemas.js';
import type { Composition } from './pool.js';

/**
 * Structural validation of a candidate script. Returns a list of human-readable
 * errors (empty = valid). These feed the auto-repair retry on failure.
 */
export function validateCandidate(
  result: GenerationResult,
  poolMap: Map<string, Character>,
  request: GenerateRequest,
  target: Composition,
): string[] {
  const errors: string[] = [];
  const ids = result.characterIds ?? [];

  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`Дубльований персонаж: ${id}`);
    seen.add(id);
    if (!poolMap.has(id)) errors.push(`Невідомий персонаж (немає в пулі): ${id}`);
  }

  for (const id of request.mustInclude) {
    if (!seen.has(id)) errors.push(`Відсутній обов'язковий персонаж: ${id}`);
  }
  for (const id of request.exclude) {
    if (seen.has(id)) errors.push(`Присутній виключений персонаж: ${id}`);
  }

  const teamCount = (team: string) =>
    ids.filter((id) => poolMap.get(id)?.team === team).length;

  const within = (n: number, lo: number, hi: number, label: string) => {
    if (n < lo || n > hi) errors.push(`${label}: ${n} (очікувано ${lo}–${hi})`);
  };
  within(teamCount('townsfolk'), target.townsfolk - 2, target.townsfolk + 1, 'Townsfolk');
  within(teamCount('outsider'), Math.max(0, target.outsiders - 1), target.outsiders + 1, 'Outsiders');
  within(teamCount('minion'), Math.max(1, target.minions - 1), target.minions + 1, 'Minions');
  within(teamCount('demon'), target.demonsMin, target.demonsMax, 'Demons');

  return errors;
}
