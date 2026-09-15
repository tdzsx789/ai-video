import { Router } from 'express';
import {
  findTaskForUser,
  upsertTask,
} from '../db/historyRepository.js';
import {
  failGeneration,
  markGenerationSubmitted,
  markGenerationUnknown,
  reserveGeneration,
  settleGeneration,
} from '../db/generationRepository.js';
import { createVideoTask, queryVideoTask, resolveApiKey } from '../services/seedanceClient.js';
import { normalizeVideoPayload } from '../services/payload.js';
import { extractTaskId, taskToClient, taskToRecord } from '../services/taskMapper.js';
import { GENERATION_COSTS } from '../services/pricing.js';
import { requireAuth } from '../middleware/auth.js';
import { httpError } from '../utils/httpError.js';

export const videoRouter = Router();
videoRouter.use(requireAuth);

function apiKeyFrom(request) {
  return resolveApiKey(request.body?.apiKey || request.headers['x-api-key']);
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
    const apiKey = apiKeyFrom(req);
    if (!apiKey) throw httpError(400, '缺少 API Key，请在页面输入或配置 OPENAI_NEXT_API_KEY。');
    const idempotencyKey = requiredIdempotencyKey(req);
    const reserve = await reserveGeneration({
      userId: req.user.id,
      kind: 'video',
      model: payload.model,
      prompt: payload.prompt || payload.content?.[0]?.text || '',
      creditCost: GENERATION_COSTS.video,
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
      res.status(generation.externalTaskId ? 200 : 202).json({
        ok: true,
        replayed: true,
        taskId: generation.externalTaskId,
        ...generationResponse(generation, reserve),
        data: generation.externalTaskId ? { id: generation.externalTaskId, status: generation.status } : null,
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

    res.status(response.status || 200).json({
      ok: true,
      status: response.status,
      taskId,
      data: { id: taskId, status: submitted.status, model: submitted.model },
      task,
      ...generationResponse(submitted, { balance: reserve.balance }),
    });
  } catch (error) {
    next(error);
  }
});

videoRouter.post('/tasks/:taskId/query', async (req, res, next) => {
  try {
    const taskId = String(req.params.taskId || '').trim();
    if (!taskId) throw httpError(400, '缺少任务编号。');

    const ownedTask = await findTaskForUser(taskId, req.user.id);
    if (!ownedTask) throw httpError(404, '任务不存在。');

    const apiKey = apiKeyFrom(req);
    if (!apiKey) throw httpError(400, '缺少 API Key，请在页面输入或配置 OPENAI_NEXT_API_KEY。');
    let response;
    try {
      response = await queryVideoTask(apiKey, taskId);
    } catch (error) {
      await markGenerationUnknown({
        userId: req.user.id,
        generationId: ownedTask.generation_request_id,
        error,
      });
      throw error;
    }
    if (!response.ok) {
      await markGenerationUnknown({
        userId: req.user.id,
        generationId: ownedTask.generation_request_id,
        error: response.error || new Error(`上游查询失败（${response.status}）。`),
      });
      res.status(response.status >= 400 && response.status < 500 ? response.status : 502).json({
        ok: false,
        status: response.status,
        error: response.error,
        generationId: ownedTask.generation_request_id,
      });
      return;
    }

    const generation = {
      id: ownedTask.generation_request_id,
      creditCost: Number(ownedTask.credit_cost || GENERATION_COSTS.video),
      debitLedgerId: ownedTask.debit_ledger_id,
      billingStatus: ownedTask.billing_status,
    };
    const task = await saveVideoRecord({
      userId: req.user.id,
      generation,
      data: response.data,
      payload: {},
    });
    const record = taskToRecord(response.data);
    const terminal = ['completed', 'succeeded', 'failed', 'cancelled', 'canceled', 'expired']
      .includes(String(record.status || '').toLowerCase());
    let billing = { balance: undefined, generation: null };

    if (terminal && ['failed', 'cancelled', 'canceled', 'expired'].includes(String(record.status).toLowerCase())) {
      billing = await failGeneration({
        userId: req.user.id,
        generationId: ownedTask.generation_request_id,
        kind: 'video',
        amount: generation.creditCost,
        reason: `任务结束状态：${record.status}`,
      });
    } else if (terminal) {
      billing = await settleGeneration({
        userId: req.user.id,
        generationId: ownedTask.generation_request_id,
        resultUrl: record.videoUrl,
        resultMetadata: {
          taskId,
          lastFrameUrl: record.lastFrameUrl,
        },
      });
    }

    res.status(response.status || 200).json({
      ok: true,
      status: response.status,
      data: taskToClient(response.data),
      task,
      clientTask: response.ok ? taskToClient(response.data) : null,
      generationId: ownedTask.generation_request_id,
      balance: billing.balance,
      billingStatus: billing.generation?.billingStatus || ownedTask.billing_status,
    });
  } catch (error) {
    next(error);
  }
});
