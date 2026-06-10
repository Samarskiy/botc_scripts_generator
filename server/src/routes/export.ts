import { Router } from 'express';
import type { Request } from 'express';
import type { Script } from '@botc/shared';
import { buildScriptToolJson } from '../export/scriptJson.js';
import { renderScriptPdf } from '../export/scriptPdf.js';

export const exportRouter = Router();

function getScript(req: Request): Script | null {
  const s = (req.body as { script?: unknown })?.script as Script | undefined;
  if (!s || !Array.isArray(s.characters)) return null;
  return s;
}

exportRouter.post('/export/json', (req, res) => {
  const script = getScript(req);
  if (!script) {
    res.status(400).json({ error: 'Очікується тіло { script }' });
    return;
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(buildScriptToolJson(script), null, 2));
});

exportRouter.post('/export/pdf', async (req, res) => {
  const script = getScript(req);
  if (!script) {
    res.status(400).json({ error: 'Очікується тіло { script }' });
    return;
  }
  try {
    const pdf = await renderScriptPdf(script);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdf);
  } catch (e) {
    res.status(500).json({ error: `Не вдалося згенерувати PDF: ${(e as Error).message}` });
  }
});
