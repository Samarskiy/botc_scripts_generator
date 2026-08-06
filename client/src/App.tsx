import { useEffect, useRef, useState } from 'react';
import type { GenerateRequest, ProgressEvent, GenerateResult, Character } from '@botc/shared';
import { fetchHealth, fetchRoles, streamGenerate, type RoleLite } from './lib/api.js';
import { loadHomebrew } from './lib/homebrew.js';
import { ConceptForm } from './components/ConceptForm.js';
import { HomebrewManager } from './components/HomebrewManager.js';
import { GenerationProgress } from './components/GenerationProgress.js';
import { ScriptResult } from './components/ScriptResult.js';
import { SetupBanner } from './components/SetupBanner.js';
import { Backdrop } from './components/Backdrop.js';

type View = 'form' | 'running' | 'result' | 'homebrew';

export function App() {
  const [roles, setRoles] = useState<RoleLite[]>([]);
  const [homebrew, setHomebrew] = useState<Character[]>([]);
  const [view, setView] = useState<View>('form');
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keyConfigured, setKeyConfigured] = useState<boolean | null>(null);
  const lastRequest = useRef<GenerateRequest | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchRoles()
      .then(setRoles)
      .catch(() => setRoles([]));
    setHomebrew(loadHomebrew());
    fetchHealth()
      .then((h) => setKeyConfigured(h.hasApiKey))
      .catch(() => setKeyConfigured(null));
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
    <>
      <Backdrop />
      <main className="shell">
        <header className="masthead">
        <p className="eyebrow">Blood on the Clocktower · генератор сценаріїв</p>
        <h1>Складіть свій скрипт</h1>
        <p className="lede">
          Опишіть задум — і отримайте збалансований набір ролей, готовий до імпорту та друку.
        </p>
        <div className="rule" />
      </header>

      {keyConfigured === false && <SetupBanner />}

      {view === 'form' && (
        <ConceptForm
          roles={roles}
          homebrew={homebrew}
          busy={false}
          onSubmit={run}
          onOpenHomebrew={() => setView('homebrew')}
          initial={lastRequest.current ?? undefined}
        />
      )}

      {view === 'homebrew' && (
        <HomebrewManager homebrew={homebrew} onChange={setHomebrew} onBack={() => setView('form')} />
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

        {(view === 'running' || view === 'result') && (
          <button className="btn ghost back" onClick={() => setView('form')}>
            ← Новий скрипт
          </button>
        )}
      </main>
    </>
  );
}
