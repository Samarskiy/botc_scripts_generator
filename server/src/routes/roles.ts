import { Router } from 'express';
import { loadRoles } from '../data/roles.js';
import { resolveIcon } from '../icons.js';

export const rolesRouter = Router();

// Lightweight role list for the client's pickers (id, name, team, edition, ability).
rolesRouter.get('/roles', (_req, res) => {
  res.json(
    loadRoles().map(({ id, name, team, edition, ability }) => ({ id, name, team, edition, ability })),
  );
});

// PNG icon for a role id (bundled local → townsquare). Used by the pickers.
rolesRouter.get('/icon/:id', async (req, res) => {
  const buf = await resolveIcon(req.params.id);
  if (!buf) {
    res.status(404).end();
    return;
  }
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(buf);
});
