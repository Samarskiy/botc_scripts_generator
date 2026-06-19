import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ICON_BASE =
  'https://raw.githubusercontent.com/bra1n/townsquare/develop/src/assets/icons/';
const LOCAL_ICON_DIR = fileURLToPath(new URL('../assets/icons/', import.meta.url));

// Resolved once per process and memoised (null = unavailable).
const cache = new Map<string, Buffer | null>();

/** Resolve a role icon as PNG: bundled local icon first, then townsquare. */
export async function resolveIcon(id: string): Promise<Buffer | null> {
  if (cache.has(id)) return cache.get(id)!;
  let buf: Buffer | null = null;

  const local = `${LOCAL_ICON_DIR}${id}.png`;
  if (existsSync(local)) {
    try {
      buf = readFileSync(local);
    } catch {
      /* fall through */
    }
  }
  if (!buf) {
    try {
      const res = await fetch(`${ICON_BASE}${id}.png`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) buf = Buffer.from(await res.arrayBuffer());
    } catch {
      /* unavailable */
    }
  }

  cache.set(id, buf);
  return buf;
}
