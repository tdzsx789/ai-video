import { Router } from 'express';
import { clearHistory, listHistory } from '../db/historyRepository.js';

export const historyRouter = Router();

historyRouter.get('/', async (_req, res, next) => {
  try {
    const data = await listHistory();
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

historyRouter.delete('/', async (_req, res, next) => {
  try {
    const data = await clearHistory();
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
});
