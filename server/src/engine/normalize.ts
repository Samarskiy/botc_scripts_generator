import type { EvaluationResult } from '@botc/shared';
import type { GenerationResult } from './schemas.js';

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * Coerce the model's evaluation tool output into a complete EvaluationResult.
 * Forced tool use does not guarantee required fields are populated, so missing
 * axes / suggestedSwaps must not crash the refine step or the UI.
 */
export function normalizeEvaluation(raw: unknown): EvaluationResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  const a = (r.axes ?? {}) as Record<string, unknown>;
  const swaps = Array.isArray(r.suggestedSwaps) ? r.suggestedSwaps : [];
  return {
    overall: num(r.overall),
    axes: {
      infoDensity: num(a.infoDensity),
      goodEvil: num(a.goodEvil),
      redundancy: num(a.redundancy),
      degenerate: num(a.degenerate),
      jinxLoad: num(a.jinxLoad),
      complexity: num(a.complexity),
      conceptFit: num(a.conceptFit),
    },
    critique: str(r.critique),
    suggestedSwaps: swaps
      .map((s) => (s ?? {}) as Record<string, unknown>)
      .map((s) => ({ out: str(s.out), in: str(s.in), why: str(s.why) })),
  };
}

/** Coerce the model's generation tool output into a complete GenerationResult. */
export function normalizeGeneration(raw: unknown): GenerationResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  const ids = Array.isArray(r.characterIds)
    ? r.characterIds.filter((x): x is string => typeof x === 'string')
    : [];
  return {
    name: str(r.name).trim() || 'Untitled Script',
    characterIds: ids,
    conceptRationale: str(r.conceptRationale),
  };
}
