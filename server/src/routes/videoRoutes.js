import { Router } from 'express';
import { upsertTask } from '../db/historyRepository.js';
import { createVideoTask, queryVideoTask, resolveApiKey } from '../services/seedanceClient.js';
import { normalizeVideoPayload } from '../services/payload.js';
import { extractTaskId, taskToClient, taskToRecord } from '../services/taskMapper.js';

export const videoRouter = Router();

function apiKeyFrom(request) {
  return resolveApiKey(request.body?.apiKey || request.headers['x-api-key']);
}

videoRouter.post('/generate', async (req, res, next) => {
  try {
    const payload = normalizeVideoPayload(req.body);
    const response = await createVideoTask(apiKeyFrom(req), payload);
    const taskId = response.ok ? extractTaskId(response.data) : '';

    if (taskId) {
      await upsertTask(taskToRecord(response.data, payload));
    }

    res.status(response.status || 500).json({
      ok: response.ok,
      status: response.status,
      taskId,
      payload,
      data: response.data,
      error: response.error,
    });
  } catch (error) {
    next(error);
  }
});

videoRouter.post('/tasks/:taskId/query', async (req, res, next) => {
  try {
    const taskId = String(req.params.taskId || '').trim();
    if (!taskId) {
      res.status(400).json({ ok: false, error: '缺少任务编号。' });
      return;
    }

    const response = await queryVideoTask(apiKeyFrom(req), taskId);
    let task = null;
    if (response.ok && response.data && typeof response.data === 'object') {
      const record = taskToRecord(response.data);
      if (record.id) {
        task = await upsertTask(record);
      }
    }

    res.status(response.status || 500).json({
      ok: response.ok,
      status: response.status,
      data: response.data,
      task,
      clientTask: response.ok ? taskToClient(response.data) : null,
      error: response.error,
    });
  } catch (error) {
    next(error);
  }
});
