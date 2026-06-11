import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanReminder } from './scriptPdf.js';

test('cleanReminder strips :reminder: placeholders', () => {
  assert.equal(
    cleanReminder('The Poisoner chooses a player. :reminder:'),
    'The Poisoner chooses a player.',
  );
});

test('cleanReminder unwraps *emphasis* markers', () => {
  assert.equal(cleanReminder('Point to the *DEMON* player'), 'Point to the DEMON player');
});

test('cleanReminder collapses whitespace', () => {
  assert.equal(cleanReminder('  multiple   spaces  '), 'multiple spaces');
});
