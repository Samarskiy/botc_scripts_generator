import type { Script } from '@botc/shared';

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'script';

/**
 * Build the official Script Tool JSON: a `_meta` header followed by character
 * ids. Homebrew characters are inlined as full objects so the script stays
 * importable.
 */
export function toScriptToolJson(script: Script): unknown[] {
  const meta = { id: '_meta', name: script.name, author: 'BotC Generator' };
  const entries = script.characters.map((c) =>
    c.homebrew ? { id: c.id, name: c.name, team: c.team, ability: c.ability } : c.id,
  );
  return [meta, ...entries];
}

export function downloadScriptJson(script: Script): void {
  const data = JSON.stringify(toScriptToolJson(script), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug(script.name)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
