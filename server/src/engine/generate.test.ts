import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Character, GenerateRequest, EvaluationResult } from '@botc/shared';
import type { LlmClient, GenerateInput, EvaluateInput } from './llm.js';
import type { GenerationResult } from './schemas.js';
import { runGeneration, GenerationError, type EngineConfig } from './generate.js';
import { buildPool, InfeasibleError } from './pool.js';

// ---- Fixtures ----

function ch(id: string, team: Character['team']): Character {
  return { id, name: id, team, edition: 'tb', ability: `${id} ability` };
}

const ROSTER: Character[] = [
  ...['tf1', 'tf2', 'tf3', 'tf4', 'tf5', 'tf6', 'tf7', 'tf8'].map((id) => ch(id, 'townsfolk')),
  ...['o1', 'o2', 'o3'].map((id) => ch(id, 'outsider')),
  ...['m1', 'm2', 'm3'].map((id) => ch(id, 'minion')),
  ...['d1', 'd2'].map((id) => ch(id, 'demon')),
];

// Teensyville target (6/2/2/1) — keeps the fixture small.
const REQUEST: GenerateRequest = {
  concept: 'test concept',
  players: { min: 5, max: 6 },
  complexity: 'medium',
  editions: ['tb'],
  includeHomebrew: false,
  mustInclude: [],
  exclude: [],
  homebrew: [],
};

const CFG: EngineConfig = { balanceThreshold: 8, maxIterations: 2, autoRepairAttempts: 2 };

const VALID_IDS = ['tf1', 'tf2', 'tf3', 'tf4', 'tf5', 'tf6', 'o1', 'o2', 'm1', 'm2', 'd1'];

function validCandidate(name: string): GenerationResult {
  return { name, characterIds: [...VALID_IDS], conceptRationale: 'because' };
}

function evalResult(overall: number): EvaluationResult {
  return {
    overall,
    axes: {
      infoDensity: overall,
      goodEvil: overall,
      redundancy: overall,
      degenerate: overall,
      jinxLoad: overall,
      complexity: overall,
      conceptFit: overall,
    },
    critique: `score ${overall}`,
    suggestedSwaps: [],
  };
}

/** Mock driven by scripted generate/evaluate return values. */
class MockLlm implements LlmClient {
  generateCalls = 0;
  evaluateCalls = 0;
  constructor(
    private gen: (n: number, input: GenerateInput) => GenerationResult,
    private evl: (n: number, input: EvaluateInput) => EvaluationResult,
  ) {}
  async generate(input: GenerateInput): Promise<GenerationResult> {
    return this.gen(this.generateCalls++, input);
  }
  async evaluate(input: EvaluateInput): Promise<EvaluationResult> {
    return this.evl(this.evaluateCalls++, input);
  }
}

// ---- Tests ----

test('stops immediately when the first candidate meets the threshold', async () => {
  const llm = new MockLlm(
    () => validCandidate('A'),
    () => evalResult(9),
  );
  const result = await runGeneration(REQUEST, ROSTER, llm, CFG);
  assert.equal(result.script.name, 'A');
  assert.equal(result.belowThreshold, false);
  assert.equal(llm.generateCalls, 1);
  assert.equal(llm.evaluateCalls, 1);
});

test('refines once when the first candidate is below threshold', async () => {
  const llm = new MockLlm(
    (n) => validCandidate(n === 0 ? 'first' : 'second'),
    (n) => evalResult(n === 0 ? 6 : 9),
  );
  const result = await runGeneration(REQUEST, ROSTER, llm, CFG);
  assert.equal(result.script.name, 'second');
  assert.equal(result.belowThreshold, false);
  assert.equal(llm.generateCalls, 2);
  assert.equal(llm.evaluateCalls, 2);
});

test('returns the best candidate and flags below-threshold at the iteration cap', async () => {
  // Scores 5, 7, 6 across iterations — best is the second (7).
  const scores = [5, 7, 6];
  const llm = new MockLlm(
    (n) => validCandidate(`cand${n}`),
    (n) => evalResult(scores[n]),
  );
  const result = await runGeneration(REQUEST, ROSTER, llm, CFG);
  assert.equal(result.evaluation.overall, 7);
  assert.equal(result.script.name, 'cand1');
  assert.equal(result.belowThreshold, true);
  // initial + 2 refinements = 3 generate calls, 3 evaluations
  assert.equal(llm.generateCalls, 3);
  assert.equal(llm.evaluateCalls, 3);
});

test('auto-repairs a structurally invalid first attempt', async () => {
  const llm = new MockLlm(
    (n) =>
      n === 0
        ? { name: 'bad', characterIds: ['nonexistent'], conceptRationale: 'x' }
        : validCandidate('repaired'),
    () => evalResult(9),
  );
  const result = await runGeneration(REQUEST, ROSTER, llm, CFG);
  assert.equal(result.script.name, 'repaired');
  assert.equal(llm.generateCalls, 2); // first invalid, second valid
});

test('throws GenerationError when repair attempts are exhausted', async () => {
  const llm = new MockLlm(
    () => ({ name: 'bad', characterIds: ['nope'], conceptRationale: 'x' }),
    () => evalResult(9),
  );
  await assert.rejects(() => runGeneration(REQUEST, ROSTER, llm, CFG), GenerationError);
  // autoRepairAttempts=2 → 3 total generate attempts
  assert.equal(llm.generateCalls, 3);
});

test('buildPool throws InfeasibleError for an unknown must-include', () => {
  assert.throws(
    () => buildPool({ ...REQUEST, mustInclude: ['ghost'] }, ROSTER),
    InfeasibleError,
  );
});

test('buildPool throws InfeasibleError when the pool lacks a demon', () => {
  const noDemons = ROSTER.filter((c) => c.team !== 'demon');
  assert.throws(() => buildPool(REQUEST, noDemons), InfeasibleError);
});
