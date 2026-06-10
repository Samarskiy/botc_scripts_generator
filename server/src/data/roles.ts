import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Character } from '@botc/shared';

// shared/roles.json sits three levels up from this module in both dev
// (server/src/data) and prod (server/dist/data).
const ROLES_PATH = fileURLToPath(new URL('../../../shared/roles.json', import.meta.url));

let cache: Character[] | null = null;
let index: Map<string, Character> | null = null;

/** All official + fabled characters, loaded once and memoised. */
export function loadRoles(): Character[] {
  if (!cache) {
    cache = JSON.parse(readFileSync(ROLES_PATH, 'utf8')) as Character[];
  }
  return cache;
}

/** Look up a single character by id. */
export function getRoleById(id: string): Character | undefined {
  if (!index) index = new Map(loadRoles().map((c) => [c.id, c]));
  return index.get(id);
}
