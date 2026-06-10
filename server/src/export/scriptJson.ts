import type { Script } from '@botc/shared';

/**
 * Build the official Script Tool JSON: a `_meta` header followed by character
 * entries. Official characters are bare ids; homebrew characters are inlined
 * as full objects so the script stays importable.
 */
export function buildScriptToolJson(script: Script): unknown[] {
  const meta = { id: '_meta', name: script.name, author: 'BotC Generator' };
  const entries = script.characters.map((c) =>
    c.homebrew ? { id: c.id, name: c.name, team: c.team, ability: c.ability } : c.id,
  );
  return [meta, ...entries];
}
