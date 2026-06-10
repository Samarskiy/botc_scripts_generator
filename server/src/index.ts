import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { config, hasApiKey } from './config.js';
import { generateRouter } from './routes/generate.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

// Health check — also reports whether an API key is configured.
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', hasApiKey: hasApiKey(), model: config.model });
});

app.use('/api', generateRouter);
// Routes for /api/export are mounted in a later phase.

// In production, serve the built client.
if (config.serveClient) {
  const clientDist = fileURLToPath(new URL('../../client/dist', import.meta.url));
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(config.port, () => {
  console.log(`[server] listening on http://localhost:${config.port}`);
  if (!hasApiKey()) {
    console.warn('[server] ANTHROPIC_API_KEY is not set — generation will fail until it is configured in .env');
  }
});
