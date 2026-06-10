import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGenerateRequest } from './validate-request.js';

const valid = {
  concept: 'horror about witches',
  players: { min: 7, max: 12 },
  complexity: 'medium',
  editions: ['tb', 'bmr'],
  mustInclude: ['imp'],
  exclude: ['spy'],
};

test('accepts a valid request and normalises defaults', () => {
  const { request, errors } = parseGenerateRequest(valid);
  assert.equal(errors.length, 0);
  assert.ok(request);
  assert.equal(request!.concept, 'horror about witches');
  assert.equal(request!.includeHomebrew, false);
  assert.deepEqual(request!.homebrew, []);
});

test('rejects a missing concept', () => {
  const { request, errors } = parseGenerateRequest({ ...valid, concept: '   ' });
  assert.equal(request, undefined);
  assert.ok(errors.some((e) => e.startsWith('concept')));
});

test('rejects a bad player range', () => {
  const { errors } = parseGenerateRequest({ ...valid, players: { min: 3, max: 30 } });
  assert.ok(errors.some((e) => e.startsWith('players')));
});

test('rejects an unknown complexity', () => {
  const { errors } = parseGenerateRequest({ ...valid, complexity: 'extreme' });
  assert.ok(errors.some((e) => e.startsWith('complexity')));
});

test('rejects empty or invalid editions', () => {
  assert.ok(parseGenerateRequest({ ...valid, editions: [] }).errors.some((e) => e.startsWith('editions')));
  assert.ok(
    parseGenerateRequest({ ...valid, editions: ['nope'] }).errors.some((e) => e.startsWith('editions')),
  );
});
