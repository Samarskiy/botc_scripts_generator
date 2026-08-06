// Bundles a PNG icon for every character so the app never depends on the
// network at runtime. Prefers the official Pandemonium webp set (converted to
// PNG — pdfkit can't embed webp) and falls back to townsquare. Re-run with:
//   npm run data:icons
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const TS = 'https://raw.githubusercontent.com/bra1n/townsquare/develop/src/assets/icons/';
const API =
  'https://api.github.com/repos/ThePandemoniumInstitute/botc-release/contents/resources/characters';

const roles = JSON.parse(
  readFileSync(fileURLToPath(new URL('../shared/roles.json', import.meta.url)), 'utf8'),
);

/**
 * Map every official id to its icon variants: plain, `_g` (good/blue) and
 * `_e` (evil/red). The right one depends on the character's team.
 */
async function buildTpiIndex() {
  const folders = await (await fetch(API, { headers: { 'User-Agent': 'node' } })).json();
  const index = new Map();
  for (const folder of folders.filter((f) => f.type === 'dir')) {
    const files = await (await fetch(folder.url, { headers: { 'User-Agent': 'node' } })).json();
    for (const f of files) {
      const m = /^([a-z0-9]+)(?:_(g|e))?\.webp$/i.exec(f.name);
      if (!m) continue;
      const id = m[1].toLowerCase();
      const variant = m[2]?.toLowerCase() ?? 'plain';
      const entry = index.get(id) ?? {};
      entry[variant] = f.download_url;
      index.set(id, entry);
    }
  }
  return index;
}

/** Evil characters must use the red icon, good ones the blue. */
function pickVariant(entry, team) {
  const order =
    team === 'minion' || team === 'demon'
      ? ['e', 'plain', 'g']
      : team === 'townsfolk' || team === 'outsider'
        ? ['g', 'plain', 'e']
        : ['plain', 'g', 'e'];
  for (const v of order) if (entry[v]) return entry[v];
  return null;
}

/**
 * Guard against picking the wrong variant: evil icons are inked red, good ones
 * blue. Returns a description when the dominant channel contradicts the team.
 */
async function wrongAlignmentColour(png, team) {
  const evil = team === 'minion' || team === 'demon';
  const good = team === 'townsfolk' || team === 'outsider';
  if (!evil && !good) return null;

  const { data } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let r = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 60) {
      r += data[i];
      b += data[i + 2];
      n++;
    }
  }
  if (!n) return null;
  const reddish = r / n > b / n;
  if (evil === reddish) return null;
  return `expected ${evil ? 'red' : 'blue'}, got avg red ${(r / n) | 0} / blue ${(b / n) | 0}`;
}

async function townsquareIcon(id) {
  try {
    const res = await fetch(`${TS}${id}.png`);
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

async function main() {
  const index = await buildTpiIndex();
  const outDir = fileURLToPath(new URL('../server/assets/icons/', import.meta.url));
  mkdirSync(outDir, { recursive: true });

  let bundled = 0;
  let fromTownsquare = 0;
  const missing = [];
  const miscoloured = [];

  for (const c of roles) {
    // Official set first (it carries the good/evil variants), townsquare after.
    const url = pickVariant(index.get(c.id) ?? {}, c.team);
    let source = null;
    if (url) {
      source = Buffer.from(await (await fetch(url)).arrayBuffer());
    } else {
      source = await townsquareIcon(c.id);
      if (source) fromTownsquare++;
    }
    if (!source) {
      missing.push(c.id);
      continue;
    }

    const png = await sharp(source).resize(160, 160, { fit: 'inside' }).png().toBuffer();
    writeFileSync(`${outDir}${c.id}.png`, png);
    bundled++;

    const wrong = await wrongAlignmentColour(png, c.team);
    if (wrong) miscoloured.push(`${c.id} (${c.team}) — ${wrong}`);
  }

  console.log(`Bundled ${bundled}/${roles.length} icons to ${outDir}`);
  console.log(`  official set: ${bundled - fromTownsquare}, townsquare fallback: ${fromTownsquare}`);
  if (missing.length) console.log(`No icon found for ${missing.length}: ${missing.join(', ')}`);
  if (miscoloured.length) {
    console.warn(`\nWARNING — icon colour does not match alignment:\n  ${miscoloured.join('\n  ')}`);
  }
}

main().catch((e) => {
  console.error('fetch-icons failed:', e.message);
  process.exit(1);
});
