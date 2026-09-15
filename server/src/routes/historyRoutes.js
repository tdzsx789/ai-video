import { Router } from 'express';
import { clearHistory, listHistory } from '../db/historyRepository.js';
import { requireAuth } from '../middleware/auth.js';

export const historyRouter = Router();
historyRouter.use(requireAuth);

historyRouter.get('/', async (req, res, next) => {
  try {
    const data = await listHistory(req.user.id, req.query.limit);
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

historyRouter.delete('/', async (req, res, next) => {
  try {
    const data = await clearHistory(req.user.id);
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
});
