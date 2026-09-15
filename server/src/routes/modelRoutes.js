import { Router } from 'express';
import { config } from '../config/env.js';
import { resolveApiKey } from '../services/seedanceClient.js';
import { requireAuth } from '../middleware/auth.js';

export const modelRouter = Router();
modelRouter.use(requireAuth);

modelRouter.get('/', async (req, res, next) => {
  try {
    const apiKey = resolveApiKey(req.headers['x-api-key']);
    if (!apiKey) {
      res.status(400).json({ ok: false, error: '缺少 API Key。' });
      return;
    }

    const response = await fetch(`${config.drawBaseUrl}/v1/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const raw = await response.text();
    let data = raw;
    try {
      data = JSON.parse(raw);
    } catch {
      // Keep raw response.
    }
    res.status(response.status).json({ ok: response.ok, status: response.status, data, raw });
  } catch (error) {
    next(error);
  }
});
