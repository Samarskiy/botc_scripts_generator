import type { Character, GenerateRequest, Script, EvaluationResult } from '@botc/shared';
import type { GenerationResult } from './schemas.js';
import type { Composition } from './pool.js';

export interface GenerateInput {
  pool: Character[];
  request: GenerateRequest;
  target: Composition;
  /** Critique from the previous evaluation, for a refinement pass. */
  critique?: EvaluationResult;
  /** Structural errors from the previous attempt, for auto-repair. */
  repairErrors?: string[];
}

export interface EvaluateInput {
  script: Script;
  request: GenerateRequest;
}

/**
 * Abstraction over the model so the engine can be tested deterministically
 * against a mock without real API calls. AnthropicLlmClient is the real impl.
 */
export interface LlmClient {
  generate(input: GenerateInput): Promise<GenerationResult>;
  evaluate(input: EvaluateInput): Promise<EvaluationResult>;
}
