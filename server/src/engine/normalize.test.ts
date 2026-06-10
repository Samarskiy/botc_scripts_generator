import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEvaluation, normalizeGeneration } from './normalize.js';

test('normalizeEvaluation fills in missing fields safely', () => {
  // The exact crash case: model omitted suggestedSwaps and axes.
  const e = normalizeEvaluation({ overall: 7, critique: 'ok' });
  assert.equal(e.overall, 7);
  assert.deepEqual(e.suggestedSwaps, []);
  assert.equal(e.axes.infoDensity, 0);
  assert.equal(e.axes.conceptFit, 0);
});

test('normalizeEvaluation handles a completely empty object', () => {
  const e = normalizeEvaluation({});
  assert.equal(e.overall, 0);
  assert.equal(e.critique, '');
  assert.equal(e.suggestedSwaps.length, 0);
});

test('normalizeEvaluation coerces swap entries', () => {
  const e = normalizeEvaluation({ suggestedSwaps: [{ out: 'imp' }, null] });
  assert.equal(e.suggestedSwaps.length, 2);
  assert.equal(e.suggestedSwaps[0].out, 'imp');
  assert.equal(e.suggestedSwaps[0].in, '');
});

test('normalizeGeneration defaults name and filters ids', () => {
  const g = normalizeGeneration({ characterIds: ['imp', 5, null, 'poisoner'] });
  assert.equal(g.name, 'Untitled Script');
  assert.deepEqual(g.characterIds, ['imp', 'poisoner']);
});
