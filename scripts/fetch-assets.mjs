// Downloads the bundled PDF font (Noto Sans, covers Latin + Cyrillic) into
// server/assets/. Re-run with:  npm run data:assets
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FONT_URL =
  'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf';

async function main() {
  const res = await fetch(FONT_URL);
  if (!res.ok) throw new Error(`${FONT_URL} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());

  const dir = fileURLToPath(new URL('../server/assets/', import.meta.url));
  mkdirSync(dir, { recursive: true });
  const out = fileURLToPath(new URL('../server/assets/NotoSans-Regular.ttf', import.meta.url));
  writeFileSync(out, buf);
  console.log(`Wrote ${(buf.length / 1024) | 0}KB to ${out}`);
}

main().catch((e) => {
  console.error('fetch-assets failed:', e.message);
  process.exit(1);
});
