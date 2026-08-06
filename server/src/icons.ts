import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ICON_BASE =
  'https://raw.githubusercontent.com/bra1n/townsquare/develop/src/assets/icons/';
const LOCAL_ICON_DIR = fileURLToPath(new URL('../assets/icons/', import.meta.url));

// Only successful lookups are memoised. Caching a failure would make one
// transient network blip hide an icon until the server restarts.
const cache = new Map<string, Buffer>();

/**
 * Resolve a role icon as PNG. Every official character is bundled, so this is
 * a disk read; the network is a fallback for ids added since the last
 * `npm run data:icons`.
 */
export async function resolveIcon(id: string): Promise<Buffer | null> {
  const hit = cache.get(id);
  if (hit) return hit;

  const local = `${LOCAL_ICON_DIR}${id}.png`;
  if (existsSync(local)) {
    try {
      const buf = readFileSync(local);
      cache.set(id, buf);
      return buf;
    } catch {
      /* fall through to the network */
    }
  }

  try {
    const res = await fetch(`${ICON_BASE}${id}.png`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      cache.set(id, buf);
      return buf;
    }
  } catch {
    /* unavailable — do not cache, so the next request can retry */
  }

  return null;
}
