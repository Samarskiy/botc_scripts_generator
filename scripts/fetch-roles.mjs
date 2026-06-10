// Fetches the canonical Blood on the Clocktower character data (the dataset
// used by clocktower.online / the official Script Tool) and normalises it into
// shared/roles.json in our Character schema. Re-run to refresh:  npm run data:roles
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = 'https://raw.githubusercontent.com/bra1n/townsquare/develop/src';
const SOURCES = {
  roles: `${BASE}/roles.json`,
  fabled: `${BASE}/fabled.json`,
  hatred: `${BASE}/hatred.json`,
};

/** Normalise an id to the lowercase alphanumeric form used as role ids. */
const normId = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

const mapTeam = (t) => (t === 'traveler' ? 'traveller' : t);
const mapEdition = (e) => (e === 'tb' || e === 'bmr' || e === 'snv' ? e : 'experimental');

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function main() {
  const [roles, fabled, hatred] = await Promise.all([
    getJson(SOURCES.roles),
    getJson(SOURCES.fabled),
    getJson(SOURCES.hatred),
  ]);

  // Build a jinx index: roleId -> [{ with, reason }]
  const jinxIndex = new Map();
  for (const entry of hatred) {
    const from = normId(entry.id);
    const list = (entry.hatred ?? []).map((h) => ({ with: normId(h.id), reason: h.reason ?? '' }));
    if (list.length) jinxIndex.set(from, list);
  }

  const toCharacter = (r) => {
    const id = normId(r.id);
    const c = {
      id,
      name: r.name,
      team: mapTeam(r.team),
      edition: mapEdition(r.edition),
      ability: r.ability ?? '',
    };
    if (r.setup) c.setup = true;
    const jinxes = jinxIndex.get(id);
    if (jinxes?.length) c.jinxes = jinxes;
    return c;
  };

  const seen = new Set();
  const characters = [];
  for (const r of [...roles, ...fabled]) {
    const c = toCharacter(r);
    if (!c.id || seen.has(c.id)) continue;
    seen.add(c.id);
    characters.push(c);
  }

  // Stable order: team, then id.
  const teamOrder = { townsfolk: 0, outsider: 1, minion: 2, demon: 3, traveller: 4, fabled: 5 };
  characters.sort((a, b) => (teamOrder[a.team] - teamOrder[b.team]) || a.id.localeCompare(b.id));

  const out = fileURLToPath(new URL('../shared/roles.json', import.meta.url));
  writeFileSync(out, JSON.stringify(characters, null, 2) + '\n');

  const byTeam = characters.reduce((m, c) => ((m[c.team] = (m[c.team] ?? 0) + 1), m), {});
  console.log(`Wrote ${characters.length} characters to ${out}`);
  console.log('By team:', byTeam);
}

main().catch((e) => {
  console.error('fetch-roles failed:', e.message);
  process.exit(1);
});
