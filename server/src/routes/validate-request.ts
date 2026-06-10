import type { GenerateRequest, Edition, Complexity, Character } from '@botc/shared';

const EDITIONS: Edition[] = ['tb', 'bmr', 'snv', 'experimental'];
const COMPLEXITY: Complexity[] = ['simple', 'medium', 'complex'];

/**
 * Parse and validate an untrusted /api/generate body into a GenerateRequest.
 * Returns the request when valid, otherwise a list of human-readable errors.
 */
export function parseGenerateRequest(body: unknown): { request?: GenerateRequest; errors: string[] } {
  const errors: string[] = [];
  const b = (body ?? {}) as Record<string, unknown>;

  const concept = typeof b.concept === 'string' ? b.concept.trim() : '';
  if (!concept) errors.push('concept: потрібен непорожній текст концепту');

  const players = b.players as { min?: unknown; max?: unknown } | undefined;
  const min = Number(players?.min);
  const max = Number(players?.max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 5 || max > 20 || min > max) {
    errors.push('players: очікується {min,max} у діапазоні 5–20, min ≤ max');
  }

  const complexity = b.complexity as Complexity;
  if (!COMPLEXITY.includes(complexity)) {
    errors.push(`complexity: одне з ${COMPLEXITY.join(', ')}`);
  }

  const editions = Array.isArray(b.editions) ? (b.editions as Edition[]) : [];
  if (!editions.length || editions.some((e) => !EDITIONS.includes(e))) {
    errors.push(`editions: непорожній масив із ${EDITIONS.join(', ')}`);
  }

  if (errors.length) return { errors };

  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

  const request: GenerateRequest = {
    concept,
    players: { min, max },
    complexity,
    editions,
    includeHomebrew: Boolean(b.includeHomebrew),
    mustInclude: strArr(b.mustInclude),
    exclude: strArr(b.exclude),
    homebrew: Array.isArray(b.homebrew) ? (b.homebrew as Character[]) : [],
    refineNote: typeof b.refineNote === 'string' ? b.refineNote : undefined,
  };
  return { request, errors: [] };
}
