import type { Script } from '@botc/shared';

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'script';

/** Request the chosen export from the server and trigger a browser download. */
export async function downloadExport(script: Script, format: 'json' | 'pdf'): Promise<void> {
  const res = await fetch(`/api/export/${format}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script }),
  });
  if (!res.ok) {
    let msg = `Помилка експорту (${res.status})`;
    try {
      msg = (await res.json()).error ?? msg;
    } catch {
      /* keep default */
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug(script.name)}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}
