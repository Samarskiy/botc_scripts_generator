import { Router } from 'express';
import type { ProgressEvent } from '@botc/shared';
import { config, hasApiKey } from '../config.js';
import { loadRoles } from '../data/roles.js';
import { AnthropicLlmClient } from '../anthropic.js';
import { runGeneration, GenerationError } from '../engine/generate.js';
import { buildPool, InfeasibleError } from '../engine/pool.js';
import { parseGenerateRequest } from './validate-request.js';

export const generateRouter = Router();

// One client for the process; the key is constant from config.
let llm: AnthropicLlmClient | null = null;
const getLlm = () => (llm ??= new AnthropicLlmClient());

generateRouter.post('/generate', async (req, res) => {
  if (!hasApiKey()) {
    res.status(401).json({ error: 'ANTHROPIC_API_KEY не налаштовано. Додайте ключ у .env.' });
    return;
  }

  const { request, errors } = parseGenerateRequest(req.body);
  if (!request) {
    res.status(400).json({ error: 'Некоректний запит', details: errors });
    return;
  }

  const roles = loadRoles();

  // Pre-flight feasibility so the client gets a clean 422 before streaming.
  try {
    buildPool(request, roles);
  } catch (e) {
    if (e instanceof InfeasibleError) {
      res.status(422).json({ error: e.message });
      return;
    }
    throw e;
  }

  // Stream progress as Server-Sent Events.
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const send = (e: ProgressEvent) => res.write(`data: ${JSON.stringify(e)}\n\n`);

  try {
    const result = await runGeneration(
      request,
      roles,
      getLlm(),
      {
        balanceThreshold: config.balanceThreshold,
        maxIterations: config.maxIterations,
        autoRepairAttempts: config.autoRepairAttempts,
      },
      send,
    );
    send({ stage: 'done', result });
  } catch (e) {
    send({ stage: 'error', error: errorMessage(e) });
  } finally {
    res.end();
  }
});

function errorMessage(e: unknown): string {
  if (e instanceof GenerationError) return e.message;
  const err = e as { status?: number; message?: string };
  if (err?.status === 429) return 'Перевищено ліміт запитів Anthropic. Спробуйте за хвилину.';
  if (err?.status === 401) return 'Невірний Anthropic API-ключ.';
  if (err?.status === 529) return 'Сервіс Anthropic перевантажений. Спробуйте пізніше.';
  return err?.message ?? 'Невідома помилка генерації.';
}
