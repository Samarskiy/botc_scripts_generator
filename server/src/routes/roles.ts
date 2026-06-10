import { Router } from 'express';
import { loadRoles } from '../data/roles.js';

export const rolesRouter = Router();

// Lightweight role list for the client's pickers (id, name, team, edition).
rolesRouter.get('/roles', (_req, res) => {
  res.json(loadRoles().map(({ id, name, team, edition }) => ({ id, name, team, edition })));
});
