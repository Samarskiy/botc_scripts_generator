import { useEffect, useRef, useState } from 'react';
import type { GenerateRequest, ProgressEvent, GenerateResult } from '@botc/shared';
import { fetchRoles, streamGenerate, type RoleLite } from './lib/api.js';
import { ConceptForm } from './components/ConceptForm.js';
import { GenerationProgress } from './components/GenerationProgress.js';
import { ScriptResult } from './components/ScriptResult.js';

type View = 'form' | 'running' | 'result';

export function App() {
  const [roles, setRoles] = useState<RoleLite[]>([]);
  const [view, setView] = useState<View>('form');
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastRequest = useRef<GenerateRequest | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchRoles()
      .then(setRoles)
      .catch(() => setRoles([]));
  }, []);

  const run = async (request: GenerateRequest) => {
    lastRequest.current = request;
    setView('running');
    setEvents([]);
    setResult(null);
    setError(null);

    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;

    try {
      await streamGenerate(
        request,
        (e) => {
          setEvents((prev) => [...prev, e]);
          if (e.stage === 'done' && e.result) {
            setResult(e.result);
            setView('result');
          } else if (e.stage === 'error') {
            setError(e.error ?? 'Невідома помилка');
            setView('result');
          }
        },
        ac.signal,
      );
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(String(err));
        setView('result');
      }
    }
  };

  return (
    <main className="shell">
      <h1>🎲 BotC — Генератор збалансованих скриптів</h1>

      {view === 'form' && (
        <ConceptForm
          roles={roles}
          busy={false}
          onSubmit={run}
          initial={lastRequest.current ?? undefined}
        />
      )}

      {view === 'running' && <GenerationProgress events={events} />}

      {view === 'result' &&
        (error ? (
          <div className="card">
            <p className="error">{error}</p>
          </div>
        ) : (
          result && (
            <ScriptResult
              result={result}
              busy={false}
              onRefine={(note) => run({ ...lastRequest.current!, refineNote: note || undefined })}
              onRegenerate={() => run({ ...lastRequest.current!, refineNote: undefined })}
            />
          )
        ))}

      {view !== 'form' && (
        <button className="btn ghost back" onClick={() => setView('form')}>
          ← Новий скрипт
        </button>
      )}
    </main>
  );
}
