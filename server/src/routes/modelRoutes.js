import { Router } from 'express';
import { config } from '../config/env.js';
import { resolveApiKey } from '../services/seedanceClient.js';
import { requireAuth } from '../middleware/auth.js';

export const modelRouter = Router();
modelRouter.use(requireAuth);

modelRouter.get('/', async (req, res, next) => {
  try {
    const apiKey = resolveApiKey();
    if (!apiKey) {
      res.status(503).json({ ok: false, error: '生成服务暂未配置，请联系管理员。' });
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
