import { pool } from './pool.js';

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.task_id,
    platformTaskId: row.platform_task_id || '',
    status: row.status || '',
    model: row.model || '',
    prompt: row.prompt || '',
    duration: row.duration ?? '',
    resolution: row.resolution || '',
    videoUrl: row.video_url || '',
    lastFrameUrl: row.last_frame_url || '',
    createdAt: row.created_at?.toISOString?.() || row.created_at || '',
    finishedAt: row.finished_at?.toISOString?.() || row.finished_at || '',
    savedAt: row.saved_at?.toISOString?.() || row.saved_at || '',
  };
}

export async function upsertTask(task) {
  if (!task?.id) {
    throw new Error('缺少任务编号，无法保存历史记录。');
  }

  const query = `
    INSERT INTO video_tasks (
      task_id,
      platform_task_id,
      status,
      model,
      prompt,
      duration,
      resolution,
      video_url,
      last_frame_url,
      request_payload,
      upstream_response,
      created_at,
      finished_at,
      saved_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12, $13, COALESCE($14, NOW()), NOW())
    ON CONFLICT (task_id) DO UPDATE SET
      platform_task_id = EXCLUDED.platform_task_id,
      status = EXCLUDED.status,
      model = COALESCE(NULLIF(EXCLUDED.model, ''), video_tasks.model),
      prompt = COALESCE(NULLIF(EXCLUDED.prompt, ''), video_tasks.prompt),
      duration = COALESCE(EXCLUDED.duration, video_tasks.duration),
      resolution = COALESCE(NULLIF(EXCLUDED.resolution, ''), video_tasks.resolution),
      video_url = COALESCE(NULLIF(EXCLUDED.video_url, ''), video_tasks.video_url),
      last_frame_url = COALESCE(NULLIF(EXCLUDED.last_frame_url, ''), video_tasks.last_frame_url),
      request_payload = CASE
        WHEN EXCLUDED.request_payload = '{}'::jsonb THEN video_tasks.request_payload
        ELSE EXCLUDED.request_payload
      END,
      upstream_response = EXCLUDED.upstream_response,
      created_at = COALESCE(EXCLUDED.created_at, video_tasks.created_at),
      finished_at = COALESCE(EXCLUDED.finished_at, video_tasks.finished_at),
      saved_at = COALESCE(video_tasks.saved_at, EXCLUDED.saved_at),
      updated_at = NOW()
    RETURNING *;
  `;

  const values = [
    task.id,
    task.platformTaskId || null,
    task.status || 'queued',
    task.model || 'doubao-seedance-2-0-fast-260128',
    task.prompt || '',
    task.duration === '' || task.duration === undefined ? null : Number(task.duration),
    task.resolution || null,
    task.videoUrl || '',
    task.lastFrameUrl || '',
    JSON.stringify(task.requestPayload || {}),
    JSON.stringify(task.upstreamResponse || {}),
    task.createdAt || null,
    task.finishedAt || null,
    task.savedAt || null,
  ];

  const { rows } = await pool.query(query, values);
  return mapRow(rows[0]);
}

export async function listHistory(limit = 100) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const { rows } = await pool.query(
    'SELECT * FROM video_tasks WHERE video_url IS NOT NULL AND video_url <> \'\' ORDER BY saved_at DESC LIMIT $1',
    [safeLimit],
  );
  return rows.map(mapRow);
}

export async function clearHistory() {
  await pool.query('DELETE FROM video_tasks');
  return [];
}

export async function countTasks() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM video_tasks');
  return rows[0]?.count || 0;
}
