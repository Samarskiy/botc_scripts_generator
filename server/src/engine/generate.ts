import type {
  Character,
  GenerateRequest,
  Script,
  EvaluationResult,
  GenerateResult,
} from '@botc/shared';
import type { LlmClient } from './llm.js';
import type { GenerationResult } from './schemas.js';
import { buildPool, targetComposition } from './pool.js';
import { validateCandidate } from './validate.js';

export interface EngineConfig {
  balanceThreshold: number;
  maxIterations: number;
  autoRepairAttempts: number;
}

/** Thrown when the model can't produce a structurally valid script. */
export class GenerationError extends Error {}

function toScript(result: GenerationResult, poolMap: Map<string, Character>): Script {
  return {
    name: result.name,
    characters: result.characterIds
      .map((id) => poolMap.get(id))
      .filter((c): c is Character => Boolean(c)),
    conceptRationale: result.conceptRationale,
  };
}

/**
 * Run the Generate → Evaluate → Refine loop.
 * Always returns the best-scoring candidate seen, flagging when it never
 * reached the balance threshold.
 */
export async function runGeneration(
  request: GenerateRequest,
  roles: Character[],
  llm: LlmClient,
  cfg: EngineConfig,
): Promise<GenerateResult> {
  const pool = buildPool(request, roles);
  const poolMap = new Map(pool.map((c) => [c.id, c]));
  const target = targetComposition(request.players);

  // Generate a candidate and auto-repair structural errors up to the limit.
  const generateValidated = async (critique?: EvaluationResult): Promise<Script> => {
    let repairErrors: string[] | undefined;
    for (let attempt = 0; attempt <= cfg.autoRepairAttempts; attempt++) {
      const candidate = await llm.generate({ pool, request, target, critique, repairErrors });
      const errors = validateCandidate(candidate, poolMap, request, target);
      if (errors.length === 0) return toScript(candidate, poolMap);
      repairErrors = errors;
    }
    throw new GenerationError(
      `Не вдалося отримати валідний скрипт після ${cfg.autoRepairAttempts + 1} спроб: ` +
        (repairErrors?.join('; ') ?? ''),
    );
  };

  let best: { script: Script; evaluation: EvaluationResult } | null = null;
  let script = await generateValidated();

  for (let i = 0; i <= cfg.maxIterations; i++) {
    const evaluation = await llm.evaluate({ script, request });
    if (!best || evaluation.overall > best.evaluation.overall) {
      best = { script, evaluation };
    }
    if (evaluation.overall >= cfg.balanceThreshold) break;
    if (i === cfg.maxIterations) break;
    script = await generateValidated(evaluation);
  }

  return {
    script: best!.script,
    evaluation: best!.evaluation,
    belowThreshold: best!.evaluation.overall < cfg.balanceThreshold,
  };
}
