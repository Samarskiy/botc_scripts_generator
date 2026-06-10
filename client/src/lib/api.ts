import type { GenerateRequest, ProgressEvent, Character } from '@botc/shared';

export type RoleLite = Pick<Character, 'id' | 'name' | 'team' | 'edition'>;

export async function fetchRoles(): Promise<RoleLite[]> {
  const res = await fetch('/api/roles');
  if (!res.ok) throw new Error('Не вдалося завантажити список персонажів');
  return res.json();
}

/**
 * POST /api/generate and stream the Server-Sent Events back through `onEvent`.
 * Non-2xx responses (validation/feasibility/auth) arrive as JSON and are
 * surfaced as a single 'error' event.
 */
export async function streamGenerate(
  request: GenerateRequest,
  onEvent: (e: ProgressEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  });

  if (!res.ok || !res.body) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j.error + (Array.isArray(j.details) ? `: ${j.details.join('; ')}` : '');
    } catch {
      /* keep status message */
    }
    onEvent({ stage: 'error', error: msg });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';
    for (const chunk of chunks) {
      const dataLine = chunk.split('\n').find((l) => l.startsWith('data:'));
      if (!dataLine) continue;
      try {
        onEvent(JSON.parse(dataLine.slice(5).trim()) as ProgressEvent);
      } catch {
        /* ignore malformed frame */
      }
    }
  }
}
