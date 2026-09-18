import { Router } from 'express';
import { getImageTaskForUser, persistedUrl, upsertImageTask } from '../db/imageRepository.js';
import {
  failGeneration,
  markGenerationUnknown,
  reserveGeneration,
  settleGeneration,
} from '../db/generationRepository.js';
import {
  createImage,
  imageModelUnavailableError,
  isImageModelAvailable,
  normalizeImagePayload,
} from '../services/imageClient.js';
import { resolveApiKey } from '../services/seedanceClient.js';
import { GENERATION_COSTS, calculateImageGenerationCost } from '../services/pricing.js';
import { requireAuth } from '../middleware/auth.js';
import { httpError } from '../utils/httpError.js';

export const imageRouter = Router();
imageRouter.use(requireAuth);

function apiKeyFrom() {
  return resolveApiKey();
}

function idempotencyKeyFrom(request) {
  return String(
    request.get('Idempotency-Key')
      || request.body?.idempotencyKey
      || '',
  ).trim().slice(0, 128);
}

function requiredIdempotencyKey(request) {
  const key = idempotencyKeyFrom(request);
  if (!key) throw httpError(400, '缺少生成请求编号，请使用 Idempotency-Key 重试。', {
    code: 'IDEMPOTENCY_KEY_REQUIRED',
  });
  return key;
}

function generationResponse(generation, balance) {
  return {
    generationId: generation?.id || '',
    balance,
    creditCost: generation?.creditCost || GENERATION_COSTS.image,
    billingStatus: generation?.billingStatus || '',
  };
}

function replayFailure(generation) {
  return {
    code: 'GENERATION_FAILED',
    message: generation?.error?.message
      || generation?.error?.reason
      || '这次生成已经失败，积分已退还。',
  };
}

imageRouter.post('/generate', async (req, res, next) => {
  try {
    const apiKey = apiKeyFrom();
    if (!apiKey) throw httpError(503, '生成服务暂未配置，请联系管理员。', {
      code: 'GENERATION_SERVICE_NOT_CONFIGURED',
    });
    const idempotencyKey = requiredIdempotencyKey(req);

    const payload = normalizeImagePayload(req.body);
    if (!isImageModelAvailable(payload.model)) {
      throw imageModelUnavailableError(payload.model);
    }
    const creditCost = calculateImageGenerationCost(payload);
    if (creditCost === null) {
      throw httpError(400, '当前图片版本暂未配置计费规则，请切换版本后重试。', {
        code: 'PRICING_RULE_NOT_CONFIGURED',
      });
    }
    const reserve = await reserveGeneration({
      userId: req.user.id,
      kind: 'image',
      model: payload.model,
      prompt: payload.prompt,
      creditCost,
      payload,
      idempotencyKey,
    });
    const generation = reserve.generation;

    if (!reserve.created) {
      if (generation.billingStatus === 'refunded' || ['failed', 'refunded', 'cancelled'].includes(generation.status)) {
        res.status(502).json({
          ok: false,
          replayed: true,
          error: replayFailure(generation),
          ...generationResponse(generation, reserve.balance),
        });
        return;
      }
      const saved = await getImageTaskForUser(generation.id, req.user.id);
      res.status(200).json({
        ok: true,
        replayed: true,
        result: saved ? {
          imageUrl: saved.imageUrl,
          source: saved.source,
          model: saved.model,
          size: saved.size,
          ratio: saved.ratio,
          prompt: saved.prompt,
          revisedPrompt: saved.revisedPrompt,
          createdAt: saved.createdAt,
        } : null,
        ...generationResponse(generation, reserve.balance),
      });
      return;
    }

    let response;
    try {
      response = await createImage(apiKey, payload);
    } catch (error) {
      await markGenerationUnknown({ userId: req.user.id, generationId: generation.id, error });
      throw httpError(503, '图片服务暂时无法确认任务是否创建，请稍后使用相同请求重试。', {
        code: 'UPSTREAM_UNKNOWN',
        generationId: generation.id,
      });
    }

    if (!response.ok || !response.result?.imageUrl) {
      const reason = response.error?.message || '图片服务未返回可用结果。';
      const failed = await failGeneration({
        userId: req.user.id,
        generationId: generation.id,
        kind: 'image',
        amount: generation.creditCost,
        reason,
      });
      res.status(response.status >= 400 && response.status < 500 ? response.status : 502).json({
        ok: false,
        status: response.status,
        error: response.error || { code: 'IMAGE_RESULT_MISSING', message: reason },
        ...generationResponse(failed.generation, failed.balance),
      });
      return;
    }

    const saved = await upsertImageTask({
      generationRequestId: generation.id,
      userId: req.user.id,
      payload,
      result: response.result,
    });
    const settled = await settleGeneration({
      userId: req.user.id,
      generationId: generation.id,
      resultUrl: persistedUrl(response.result.imageUrl),
      resultMetadata: {
        model: response.result.model,
        size: response.result.size,
        ratio: response.result.ratio,
        source: response.result.source,
      },
    });

    res.status(response.status || 200).json({
      ok: true,
      status: response.status,
      payload,
      result: response.result,
      history: saved,
      ...generationResponse(settled.generation, settled.balance),
    });
  } catch (error) {
    next(error);
  }
});
