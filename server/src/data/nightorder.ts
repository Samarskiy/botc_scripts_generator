import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { NightOrder } from '@botc/shared';

const PATH = fileURLToPath(new URL('../../../shared/nightorder.json', import.meta.url));

let cache: NightOrder | null = null;

/** Canonical wake order (ids, including meta steps), loaded once and memoised. */
export function loadNightOrder(): NightOrder {
  if (!cache) {
    cache = JSON.parse(readFileSync(PATH, 'utf8')) as NightOrder;
  }
  return cache;
}
