import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Team, Edition } from '@botc/shared';
import { loadRoles, getRoleById } from './roles.js';

const TEAMS: Team[] = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller', 'fabled'];
const EDITIONS: Edition[] = ['tb', 'bmr', 'snv', 'experimental'];

test('loads a substantial roster', () => {
  assert.ok(loadRoles().length > 100, 'expected >100 characters');
});

test('every character has a valid team and edition', () => {
  for (const c of loadRoles()) {
    assert.ok(TEAMS.includes(c.team), `bad team for ${c.id}: ${c.team}`);
    assert.ok(EDITIONS.includes(c.edition), `bad edition for ${c.id}: ${c.edition}`);
    assert.ok(c.name && c.ability, `missing name/ability for ${c.id}`);
  }
});

test('ids are unique', () => {
  const ids = loadRoles().map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every jinx references an existing character id', () => {
  const ids = new Set(loadRoles().map((c) => c.id));
  for (const c of loadRoles()) {
    for (const j of c.jinxes ?? []) {
      assert.ok(ids.has(j.with), `${c.id} jinx points to unknown id: ${j.with}`);
    }
  }
});

test('has enough of each core team to build a full standard script', () => {
  const count = (t: Team) => loadRoles().filter((c) => c.team === t).length;
  assert.ok(count('townsfolk') >= 13);
  assert.ok(count('outsider') >= 4);
  assert.ok(count('minion') >= 4);
  assert.ok(count('demon') >= 1);
});

test('getRoleById resolves known characters', () => {
  assert.equal(getRoleById('imp')?.team, 'demon');
  assert.equal(getRoleById('fortuneteller')?.team, 'townsfolk');
  assert.equal(getRoleById('nope-not-real'), undefined);
});
