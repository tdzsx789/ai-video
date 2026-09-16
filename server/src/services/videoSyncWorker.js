import { config } from '../config/env.js';
import { claimVideoTasksForSync } from '../db/historyRepository.js';
import { syncVideoTask } from './videoTaskSync.js';

let stopWorker = null;

async function runBatch() {
  const tasks = await claimVideoTasksForSync({
    limit: config.videoSyncBatchSize,
    leaseMs: config.videoSyncLeaseMs,
  });
  if (!tasks.length) return;

  let cursor = 0;
  const worker = async () => {
    while (cursor < tasks.length) {
      const task = tasks[cursor];
      cursor += 1;
      try {
        await syncVideoTask({
          taskId: task.task_id,
          userId: task.user_id,
          existingTask: task,
          apiKey: config.openaiNextApiKey,
        });
      } catch (error) {
        console.error(`视频任务同步失败（${task.task_id}）：`, error.message);
      }
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(config.videoSyncConcurrency, tasks.length) },
      () => worker(),
    ),
  );
}

export function startVideoSyncWorker() {
  if (!config.openaiNextApiKey) {
    console.warn('未配置 OPENAI_NEXT_API_KEY，视频任务将在用户查询时同步。');
    return () => {};
  }

  let stopped = false;
  let timer = null;

  const schedule = delay => {
    if (stopped) return;
    timer = setTimeout(run, delay);
    timer.unref?.();
  };

  const run = async () => {
    if (stopped) return;
    try {
      await runBatch();
    } catch (error) {
      console.error('视频任务同步批次失败：', error.message);
    } finally {
      schedule(config.videoSyncIntervalMs);
    }
  };

  run();
  stopWorker = () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
  return stopWorker;
}

export function stopVideoSyncWorker() {
  stopWorker?.();
  stopWorker = null;
}
