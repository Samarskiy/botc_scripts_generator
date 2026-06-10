import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Script, Character } from '@botc/shared';
import { buildScriptToolJson } from './scriptJson.js';

const ch = (id: string, team: Character['team'], homebrew = false): Character => ({
  id,
  name: id,
  team,
  edition: 'tb',
  ability: `${id} ability`,
  ...(homebrew ? { homebrew: true } : {}),
});

test('golden: official ids + _meta, homebrew inlined', () => {
  const script: Script = {
    name: 'Whispers in the Coven',
    characters: [ch('fortuneteller', 'townsfolk'), ch('imp', 'demon'), ch('myrole', 'minion', true)],
    conceptRationale: 'irrelevant to export',
  };

  assert.deepEqual(buildScriptToolJson(script), [
    { id: '_meta', name: 'Whispers in the Coven', author: 'BotC Generator' },
    'fortuneteller',
    'imp',
    { id: 'myrole', name: 'myrole', team: 'minion', ability: 'myrole ability' },
  ]);
});
