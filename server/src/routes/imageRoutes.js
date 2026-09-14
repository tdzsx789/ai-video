import { Router } from 'express';
import { createImage, normalizeImagePayload } from '../services/imageClient.js';
import { resolveApiKey } from '../services/seedanceClient.js';

export const imageRouter = Router();

function apiKeyFrom(request) {
  return resolveApiKey(request.body?.apiKey || request.headers['x-api-key']);
}

imageRouter.post('/generate', async (req, res, next) => {
  try {
    const payload = normalizeImagePayload(req.body);
    const response = await createImage(apiKeyFrom(req), payload);

    res.status(response.status || 500).json({
      ok: response.ok,
      status: response.status,
      payload,
      result: response.result || null,
      data: response.data,
      error: response.error,
    });
  } catch (error) {
    next(error);
  }
});
