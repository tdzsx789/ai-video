import { Router } from 'express';
import {
  upsertTask,
} from '../db/historyRepository.js';
import {
  failGeneration,
  markGenerationSubmitted,
  markGenerationUnknown,
  reserveGeneration,
} from '../db/generationRepository.js';
import { createVideoTask, resolveApiKey } from '../services/seedanceClient.js';
import { normalizeVideoPayload } from '../services/payload.js';
import { extractTaskId, isTerminalTaskStatus, taskToRecord } from '../services/taskMapper.js';
import { GENERATION_COSTS, calculateVideoGenerationCost } from '../services/pricing.js';
import { syncVideoTask } from '../services/videoTaskSync.js';
import { requireAuth } from '../middleware/auth.js';
import { httpError } from '../utils/httpError.js';

export const videoRouter = Router();
videoRouter.use(requireAuth);

function apiKeyFrom() {
  return resolveApiKey();
}

function idempotencyKeyFrom(request) {
  return String(
    request.get('Idempotency-Key')
      || request.body?.idempotencyKey
      || request.body?.clientRequestId
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

function generationResponse(generation, extra = {}) {
  return {
    generationId: generation?.id || '',
    balance: extra.balance,
    status: generation?.status || '',
    billingStatus: generation?.billingStatus || '',
    creditCost: generation?.creditCost || GENERATION_COSTS.video,
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

async function failUpstreamGeneration({ userId, generation, reason }) {
  return failGeneration({
    userId,
    generationId: generation.id,
    kind: 'video',
    amount: generation.creditCost,
    reason,
  });
}

async function saveVideoRecord({ userId, generation, data, payload }) {
  const record = taskToRecord(data, payload);
  if (!record.id) return null;
  return upsertTask({
    ...record,
    userId,
    generationRequestId: generation.id,
    creditCost: generation.creditCost,
    debitLedgerId: generation.debitLedgerId,
    billingStatus: generation.billingStatus,
  });
}

videoRouter.post('/generate', async (req, res, next) => {
  try {
    const payload = normalizeVideoPayload(req.body);
    const apiKey = apiKeyFrom();
    if (!apiKey) throw httpError(503, '生成服务暂未配置，请联系管理员。', {
      code: 'GENERATION_SERVICE_NOT_CONFIGURED',
    });
    const idempotencyKey = requiredIdempotencyKey(req);
    const creditCost = calculateVideoGenerationCost(payload);
    if (creditCost === null) {
      throw httpError(400, '当前视频版本暂未配置计费规则，请切换版本后重试。', {
        code: 'PRICING_RULE_NOT_CONFIGURED',
      });
    }
    const reserve = await reserveGeneration({
      userId: req.user.id,
      kind: 'video',
      model: payload.model,
      prompt: payload.prompt || payload.content?.[0]?.text || '',
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
          ...generationResponse(generation, reserve),
        });
        return;
      }
      let replayedSync = null;
      if (generation.externalTaskId) {
        try {
          replayedSync = await syncVideoTask({
            taskId: generation.externalTaskId,
            userId: req.user.id,
            apiKey,
          });
        } catch (error) {
          console.warn(`重试同步视频任务失败（${generation.externalTaskId}）：`, error.message);
        }
      }
      const replayedTask = replayedSync?.clientTask || (
        generation.externalTaskId
          ? { id: generation.externalTaskId, status: generation.status }
          : null
      );
      res.status(generation.externalTaskId ? 200 : 202).json({
        ok: true,
        replayed: true,
        taskId: generation.externalTaskId,
        ...generationResponse({
          ...generation,
          status: replayedTask?.status || generation.status,
          billingStatus: replayedSync?.billingStatus || generation.billingStatus,
        }, {
          balance: replayedSync?.balance ?? reserve.balance,
        }),
        data: replayedTask,
      });
      return;
    }

    let response;
    try {
      response = await createVideoTask(apiKey, payload);
    } catch (error) {
      await markGenerationUnknown({ userId: req.user.id, generationId: generation.id, error });
      throw httpError(503, '视频服务暂时无法确认任务是否创建，请稍后使用相同请求重试。', {
        code: 'UPSTREAM_UNKNOWN',
        generationId: generation.id,
      });
    }

    if (!response.ok) {
      const reason = response.error?.message || `上游接口返回 HTTP ${response.status || 502}。`;
      const failed = await failUpstreamGeneration({ userId: req.user.id, generation, reason });
      res.status(response.status >= 400 && response.status < 500 ? response.status : 502).json({
        ok: false,
        status: response.status,
        error: response.error || { message: reason },
        ...generationResponse(failed.generation, failed),
      });
      return;
    }

    const taskId = extractTaskId(response.data);
    if (!taskId) {
      const failed = await failUpstreamGeneration({
        userId: req.user.id,
        generation,
        reason: '上游返回成功但缺少任务编号。',
      });
      res.status(502).json({
        ok: false,
        error: { code: 'TASK_ID_MISSING', message: '视频服务返回成功，但没有任务编号。' },
        ...generationResponse(failed.generation, failed),
      });
      return;
    }

    const submitted = await markGenerationSubmitted({
      userId: req.user.id,
      generationId: generation.id,
      externalTaskId: taskId,
    });
    const task = await saveVideoRecord({
      userId: req.user.id,
      generation: submitted,
      data: response.data,
      payload,
    });
    const initialRecord = taskToRecord(response.data, payload);
    let initialSync = null;
    if (task && (isTerminalTaskStatus(initialRecord.status) || initialRecord.videoUrl)) {
      try {
        initialSync = await syncVideoTask({
          taskId,
          userId: req.user.id,
          apiKey,
        });
      } catch (error) {
        console.warn(`初始同步视频任务失败（${taskId}）：`, error.message);
      }
    }
    const responseTask = initialSync?.clientTask || task;

    res.status(response.status || 200).json({
      ok: true,
      status: response.status,
      taskId,
      data: responseTask || { id: taskId, status: submitted.status, model: submitted.model },
      task: responseTask,
      ...generationResponse({
        ...submitted,
        status: initialSync?.clientTask?.status || submitted.status,
        billingStatus: initialSync?.billingStatus || submitted.billingStatus,
      }, {
        balance: initialSync?.balance ?? reserve.balance,
      }),
    });
  } catch (error) {
    next(error);
  }
});

videoRouter.post('/tasks/:taskId/query', async (req, res, next) => {
  try {
    const taskId = String(req.params.taskId || '').trim();
    if (!taskId) throw httpError(400, '缺少任务编号。');
    const apiKey = apiKeyFrom();
    const synced = await syncVideoTask({
      taskId,
      userId: req.user.id,
      apiKey,
    });
    const clientTask = synced.clientTask || {
      id: taskId,
      status: synced.record?.status || 'processing',
      videoUrl: synced.record?.videoUrl || '',
    };

    res.status(synced.response?.status || 200).json({
      ok: true,
      status: synced.response?.status || 200,
      data: clientTask,
      task: clientTask,
      clientTask,
      generationId: synced.generationId,
      balance: synced.balance,
      billingStatus: synced.billingStatus,
      source: synced.source || 'upstream',
    });
  } catch (error) {
    next(error);
  }
});
