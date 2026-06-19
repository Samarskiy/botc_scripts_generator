// Bundles PNG role icons that the runtime townsquare source doesn't cover
// (loric, fabled, newer experimental). Sources the official Pandemonium webp
// icons and converts them to PNG (pdfkit can't embed webp). Re-run with:
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

/** Map every official id to a webp download URL, preferring the plain variant. */
async function buildTpiIndex() {
  const folders = await (await fetch(API, { headers: { 'User-Agent': 'node' } })).json();
  const index = new Map();
  for (const folder of folders.filter((f) => f.type === 'dir')) {
    const files = await (await fetch(folder.url, { headers: { 'User-Agent': 'node' } })).json();
    for (const f of files) {
      const m = /^([a-z0-9]+)(?:_(g|e))?\.webp$/i.exec(f.name);
      if (!m) continue;
      const id = m[1].toLowerCase();
      const rank = m[2] === undefined ? 0 : m[2] === 'g' ? 1 : 2; // prefer plain, then good, then evil
      const cur = index.get(id);
      if (!cur || rank < cur.rank) index.set(id, { url: f.download_url, rank });
    }
  }
  return index;
}

async function townsquareHas(id) {
  try {
    return (await fetch(`${TS}${id}.png`)).ok;
  } catch {
    return false;
  }
}

async function main() {
  const index = await buildTpiIndex();
  const outDir = fileURLToPath(new URL('../server/assets/icons/', import.meta.url));
  mkdirSync(outDir, { recursive: true });

  const coverage = await Promise.all(
    roles.map(async (c) => [c.id, await townsquareHas(c.id)]),
  );
  const onTownsquare = new Set(coverage.filter(([, ok]) => ok).map(([id]) => id));

  let bundled = 0;
  const missing = [];
  for (const c of roles) {
    if (onTownsquare.has(c.id)) continue; // fetched from townsquare at runtime
    const entry = index.get(c.id);
    if (!entry) {
      missing.push(c.id);
      continue;
    }
    const webp = Buffer.from(await (await fetch(entry.url)).arrayBuffer());
    const png = await sharp(webp).resize(160, 160, { fit: 'inside' }).png().toBuffer();
    writeFileSync(`${outDir}${c.id}.png`, png);
    bundled++;
  }

  console.log(`Bundled ${bundled} icons to ${outDir}`);
  console.log(`On townsquare (runtime): ${onTownsquare.size}`);
  if (missing.length) console.log(`No icon found for ${missing.length}: ${missing.join(', ')}`);
}

main().catch((e) => {
  console.error('fetch-icons failed:', e.message);
  process.exit(1);
});
