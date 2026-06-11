import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadNightOrder } from './nightorder.js';
import { loadRoles } from './roles.js';

const META = new Set(['dusk', 'minioninfo', 'demoninfo', 'dawn']);

test('both night lists are populated and bookended by dusk/dawn', () => {
  const n = loadNightOrder();
  assert.ok(n.firstNight.length > 0);
  assert.ok(n.otherNight.length > 0);
  assert.ok(n.firstNight.includes('dusk') && n.firstNight.includes('dawn'));
  assert.ok(n.otherNight.includes('dusk') && n.otherNight.includes('dawn'));
});

test('every non-meta night-order id is a known character', () => {
  const ids = new Set(loadRoles().map((c) => c.id));
  const n = loadNightOrder();
  for (const id of [...n.firstNight, ...n.otherNight]) {
    if (META.has(id)) continue;
    assert.ok(ids.has(id), `night order id not in roles: ${id}`);
  }
});
