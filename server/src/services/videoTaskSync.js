import { config } from '../config/env.js';
import {
  claimVideoTaskForSync,
  findTaskForUser,
  releaseVideoTaskSync,
  upsertTask,
} from '../db/historyRepository.js';
import {
  failGeneration,
  settleGeneration,
} from '../db/generationRepository.js';
import {
  extractTaskStatus,
  isFailedTaskStatus,
  isSuccessfulTaskStatus,
  isTerminalTaskStatus,
  taskToClient,
  taskToRecord,
} from './taskMapper.js';
import { queryVideoTask, resolveApiKey } from './seedanceClient.js';
import { GENERATION_COSTS } from './pricing.js';
import { httpError } from '../utils/httpError.js';

function persistedTaskToClient(task) {
  if (!task) return null;
  const taskId = task.task_id || task.id || '';
  const generationId = task.generation_request_id || task.generationId || '';
  const status = task.status || '';
  const videoUrl = task.video_url || task.videoUrl || '';
  const lastFrameUrl = task.last_frame_url || task.lastFrameUrl || '';
  return {
    id: taskId,
    generationId,
    status,
    progress: isTerminalTaskStatus(status) ? '100%' : '',
    model: task.model || '',
    prompt: task.prompt || '',
    videoUrl,
    lastFrameUrl,
    resultUrl: videoUrl,
    createdAt: task.created_at?.toISOString?.() || task.created_at || task.createdAt || '',
    finishedAt: task.finished_at?.toISOString?.() || task.finished_at || task.finishedAt || '',
  };
}

function clientTaskFromResult({ rawTask, persistedTask }) {
  const raw = rawTask ? taskToClient(rawTask) : {};
  const persisted = persistedTaskToClient(persistedTask) || {};
  return {
    ...raw,
    ...persisted,
    id: persisted.id || raw.id || '',
    status: persisted.status || raw.status || '',
    progress: isTerminalTaskStatus(persisted.status)
      ? '100%'
      : raw.progress || persisted.progress || '',
    videoUrl: persisted.videoUrl || raw.videoUrl || '',
    resultUrl: persisted.resultUrl || raw.resultUrl || '',
    lastFrameUrl: persisted.lastFrameUrl || raw.lastFrameUrl || '',
    generationId: persisted.generationId || '',
  };
}

function upstreamError(response) {
  const error = new Error(
    response?.error?.message
      || `视频任务查询失败（HTTP ${response?.status || 502}）。`,
  );
  error.status = Number(response?.status) >= 400 ? Number(response.status) : 502;
  error.code = response?.error?.code || `UPSTREAM_${error.status}`;
  error.data = {
    status: response?.status,
    error: response?.error || null,
  };
  return error;
}

function isSuccessfulRecord(record) {
  return isSuccessfulTaskStatus(record?.status) || Boolean(record?.videoUrl);
}

function isFailedRecord(record) {
  return isFailedTaskStatus(record?.status);
}

function needsResultRecovery(task) {
  return isSuccessfulTaskStatus(task?.status)
    && !String(task?.video_url || task?.videoUrl || '').trim();
}

async function settleLocalTerminalTask(task) {
  if (!task?.generation_request_id || task.billing_status !== 'debited') {
    return {
      balance: undefined,
      billingStatus: task?.billing_status || '',
    };
  }

  if (isSuccessfulTaskStatus(task.status)) {
    const settled = await settleGeneration({
      userId: task.user_id,
      generationId: task.generation_request_id,
      resultUrl: task.video_url || '',
      resultMetadata: {
        taskId: task.task_id,
        lastFrameUrl: task.last_frame_url || '',
      },
    });
    return {
      balance: settled.balance,
      billingStatus: settled.generation?.billingStatus || 'settled',
    };
  }

  if (isFailedTaskStatus(task.status)) {
    const failed = await failGeneration({
      userId: task.user_id,
      generationId: task.generation_request_id,
      kind: 'video',
      amount: Number(task.credit_cost || GENERATION_COSTS.video),
      reason: `任务结束状态：${task.status}`,
    });
    return {
      balance: failed.balance,
      billingStatus: failed.generation?.billingStatus || 'refunded',
    };
  }

  return {
    balance: undefined,
    billingStatus: task.billing_status || '',
  };
}

async function finalizeSuccessfulResponse({ userId, ownedTask, response }) {
  const record = taskToRecord(response.data);
  const successful = isSuccessfulRecord(record);
  const failed = isFailedRecord(record);
  const effectiveStatus = successful
    ? 'completed'
    : failed
      ? 'failed'
      : record.status || ownedTask.status || 'processing';
  const effectiveRecord = {
    ...record,
    status: effectiveStatus,
  };
  const persisted = await upsertTask({
    ...effectiveRecord,
    id: ownedTask.task_id,
    userId,
    generationRequestId: ownedTask.generation_request_id,
    creditCost: Number(ownedTask.credit_cost || GENERATION_COSTS.video),
    debitLedgerId: ownedTask.debit_ledger_id,
    billingStatus: ownedTask.billing_status,
  });

  const persistedIsSuccessful = isSuccessfulRecord({
    status: persisted?.status,
    videoUrl: persisted?.videoUrl,
  });
  const persistedIsFailed = isFailedRecord({ status: persisted?.status });
  let billing = {
    balance: undefined,
    billingStatus: persisted?.billingStatus || ownedTask.billing_status || '',
  };
  if (successful || persistedIsSuccessful) {
    const settled = await settleGeneration({
      userId,
      generationId: ownedTask.generation_request_id,
      resultUrl: effectiveRecord.videoUrl || persisted?.videoUrl || '',
      resultMetadata: {
        taskId: ownedTask.task_id,
        lastFrameUrl: effectiveRecord.lastFrameUrl || persisted?.lastFrameUrl || '',
      },
    });
    billing = {
      balance: settled.balance,
      billingStatus: settled.generation?.billingStatus || 'settled',
    };
  } else if (failed || persistedIsFailed) {
    const failedGeneration = await failGeneration({
      userId,
      generationId: ownedTask.generation_request_id,
      kind: 'video',
      amount: Number(ownedTask.credit_cost || GENERATION_COSTS.video),
      reason: `任务结束状态：${effectiveRecord.status}`,
    });
    billing = {
      balance: failedGeneration.balance,
      billingStatus: failedGeneration.generation?.billingStatus || 'refunded',
    };
  }

  return {
    response,
    record: effectiveRecord,
    task: persisted,
    clientTask: clientTaskFromResult({
      rawTask: response.data,
      persistedTask: persisted,
    }),
    terminal: failed
      || persistedIsFailed
      || (
        (successful || persistedIsSuccessful)
        && Boolean(effectiveRecord.videoUrl || persisted?.videoUrl)
      ),
    ...billing,
  };
}

export async function syncVideoTask({
  taskId,
  userId,
  apiKey,
  existingTask = null,
}) {
  const foundTask = existingTask || await findTaskForUser(taskId, userId);
  if (!foundTask) throw httpError(404, '任务不存在。');

  if (
    isTerminalTaskStatus(foundTask.status)
    && foundTask.billing_status !== 'debited'
    && !needsResultRecovery(foundTask)
  ) {
    const billing = await settleLocalTerminalTask(foundTask);
    return {
      response: null,
      record: {
        id: foundTask.task_id,
        status: foundTask.status,
        videoUrl: foundTask.video_url || '',
        lastFrameUrl: foundTask.last_frame_url || '',
      },
      task: foundTask,
      clientTask: persistedTaskToClient(foundTask),
      terminal: true,
      generationId: foundTask.generation_request_id,
      ...billing,
      source: 'database',
    };
  }

  const ownedTask = existingTask || await claimVideoTaskForSync({
    taskId,
    leaseMs: config.videoSyncLeaseMs,
  });
  if (!ownedTask) {
    const latestTask = await findTaskForUser(taskId, userId);
    if (!latestTask) throw httpError(404, '任务不存在。');
    const billing = isTerminalTaskStatus(latestTask.status)
      ? await settleLocalTerminalTask(latestTask)
      : { balance: undefined, billingStatus: latestTask.billing_status || '' };
    return {
      response: null,
      record: {
        id: latestTask.task_id,
        status: latestTask.status,
        videoUrl: latestTask.video_url || '',
        lastFrameUrl: latestTask.last_frame_url || '',
      },
      task: latestTask,
      clientTask: persistedTaskToClient(latestTask),
      terminal: isTerminalTaskStatus(latestTask.status),
      generationId: latestTask.generation_request_id,
      ...billing,
      source: 'database',
      busy: true,
    };
  }

  if (isTerminalTaskStatus(ownedTask.status) && !needsResultRecovery(ownedTask)) {
    const billing = await settleLocalTerminalTask(ownedTask);
    await releaseVideoTaskSync({
      taskId: ownedTask.task_id,
      claimId: ownedTask.sync_claim_id,
      terminal: true,
      retryDelayMs: config.videoSyncIntervalMs,
    });
    return {
      response: null,
      record: {
        id: ownedTask.task_id,
        status: ownedTask.status,
        videoUrl: ownedTask.video_url || '',
        lastFrameUrl: ownedTask.last_frame_url || '',
      },
      task: ownedTask,
      clientTask: persistedTaskToClient(ownedTask),
      terminal: true,
      generationId: ownedTask.generation_request_id,
      ...billing,
      source: 'database',
    };
  }

  const key = resolveApiKey(apiKey);
  if (!key) {
    await releaseVideoTaskSync({
      taskId: ownedTask.task_id,
      claimId: ownedTask.sync_claim_id,
      error: httpError(503, '生成服务暂未配置，请联系管理员。', {
        code: 'GENERATION_SERVICE_NOT_CONFIGURED',
      }),
      retryDelayMs: config.videoSyncIntervalMs,
    });
    throw httpError(503, '生成服务暂未配置，请联系管理员。', {
      code: 'GENERATION_SERVICE_NOT_CONFIGURED',
    });
  }

  let response;
  try {
    response = await queryVideoTask(key, ownedTask.task_id);
  } catch (error) {
    await releaseVideoTaskSync({
      taskId: ownedTask.task_id,
      claimId: ownedTask.sync_claim_id,
      error,
      retryDelayMs: config.videoSyncIntervalMs,
    });
    throw error;
  }

  if (!response.ok) {
    const error = upstreamError(response);
    await releaseVideoTaskSync({
      taskId: ownedTask.task_id,
      claimId: ownedTask.sync_claim_id,
      error,
      retryDelayMs: config.videoSyncIntervalMs,
    });
    throw error;
  }

  try {
    const result = await finalizeSuccessfulResponse({
      userId: ownedTask.user_id || userId,
      ownedTask,
      response,
    });
    await releaseVideoTaskSync({
      taskId: ownedTask.task_id,
      claimId: ownedTask.sync_claim_id,
      terminal: result.terminal,
      retryDelayMs: config.videoSyncIntervalMs,
    });
    return result;
  } catch (error) {
    await releaseVideoTaskSync({
      taskId: ownedTask.task_id,
      claimId: ownedTask.sync_claim_id,
      error,
      retryDelayMs: config.videoSyncIntervalMs,
    });
    throw error;
  }
}

export { persistedTaskToClient };
