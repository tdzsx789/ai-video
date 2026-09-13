import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../db/pool.js';
import { schemaSql } from '../db/schema.js';
import { upsertTask } from '../db/historyRepository.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const historyFile = path.resolve(__dirname, '../../seedance-history.json');

try {
  await pool.query(schemaSql);
  const raw = await fs.readFile(historyFile, 'utf8');
  const items = JSON.parse(raw);

  for (const item of Array.isArray(items) ? items : []) {
    await upsertTask({
      id: item.id,
      platformTaskId: item.platformTaskId,
      status: item.status || 'completed',
      model: item.model,
      prompt: item.prompt,
      duration: item.duration,
      resolution: item.resolution,
      videoUrl: item.videoUrl,
      lastFrameUrl: item.lastFrameUrl,
      requestPayload: {
        model: item.model,
        prompt: item.prompt,
        duration: item.duration,
        metadata: { parameters: { resolution: item.resolution } },
      },
      upstreamResponse: { importedFrom: 'seedance-history.json' },
      createdAt: item.createdAt,
      finishedAt: item.finishedAt,
      savedAt: item.savedAt,
    });
  }

  console.log(`已导入 ${Array.isArray(items) ? items.length : 0} 条历史记录。`);
} catch (error) {
  console.error('历史记录导入失败:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
