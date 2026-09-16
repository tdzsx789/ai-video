import { pool } from './pool.js';
import { safeError, safeJson } from './safeJson.js';
import { withTransaction } from './transaction.js';

function mapRow(row) {
  if (!row) return null;
  return {
    kind: row.kind || 'video',
    id: row.task_id,
    generationId: row.generation_request_id || '',
    userId: row.user_id || '',
    platformTaskId: row.platform_task_id || '',
    status: row.status || '',
    model: row.model || '',
    prompt: row.prompt || '',
    duration: row.duration ?? '',
    resolution: row.resolution || '',
    videoUrl: row.video_url || '',
    imageUrl: row.image_url || '',
    size: row.size || '',
    ratio: row.ratio || '',
    style: row.style || '',
    lastFrameUrl: row.last_frame_url || '',
    creditCost: Number(row.credit_cost || 0),
    billingStatus: row.billing_status || '',
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
      user_id,
      generation_request_id,
      status,
      model,
      prompt,
      duration,
      resolution,
      video_url,
      last_frame_url,
      credit_cost,
      debit_ledger_id,
      billing_status,
      refund_ledger_id,
      refund_status,
      refund_reason,
      request_payload,
      upstream_response,
      created_at,
      finished_at,
      saved_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::jsonb, $19::jsonb, $20, $21, COALESCE($22, NOW()), NOW())
    ON CONFLICT (task_id) DO UPDATE SET
      platform_task_id = EXCLUDED.platform_task_id,
      user_id = COALESCE(EXCLUDED.user_id, video_tasks.user_id),
      generation_request_id = COALESCE(EXCLUDED.generation_request_id, video_tasks.generation_request_id),
      status = CASE
        WHEN video_tasks.status IN ('completed', 'succeeded') THEN video_tasks.status
        WHEN EXCLUDED.status IN ('completed', 'succeeded') THEN EXCLUDED.status
        WHEN video_tasks.status IN ('failed', 'cancelled', 'canceled', 'expired') THEN video_tasks.status
        WHEN EXCLUDED.status IN ('failed', 'cancelled', 'canceled', 'expired') THEN EXCLUDED.status
        ELSE EXCLUDED.status
      END,
      model = COALESCE(NULLIF(EXCLUDED.model, ''), video_tasks.model),
      prompt = COALESCE(NULLIF(EXCLUDED.prompt, ''), video_tasks.prompt),
      duration = COALESCE(EXCLUDED.duration, video_tasks.duration),
      resolution = COALESCE(NULLIF(EXCLUDED.resolution, ''), video_tasks.resolution),
      video_url = COALESCE(NULLIF(EXCLUDED.video_url, ''), video_tasks.video_url),
      last_frame_url = COALESCE(NULLIF(EXCLUDED.last_frame_url, ''), video_tasks.last_frame_url),
      credit_cost = GREATEST(EXCLUDED.credit_cost, video_tasks.credit_cost),
      debit_ledger_id = COALESCE(EXCLUDED.debit_ledger_id, video_tasks.debit_ledger_id),
      billing_status = CASE
        WHEN video_tasks.billing_status IN ('settled', 'refunded') THEN video_tasks.billing_status
        WHEN EXCLUDED.billing_status IN ('settled', 'refunded') THEN EXCLUDED.billing_status
        WHEN EXCLUDED.billing_status <> 'unbilled' THEN EXCLUDED.billing_status
        ELSE video_tasks.billing_status
      END,
      refund_ledger_id = COALESCE(EXCLUDED.refund_ledger_id, video_tasks.refund_ledger_id),
      refund_status = CASE
        WHEN video_tasks.refund_status = 'refunded' THEN video_tasks.refund_status
        WHEN EXCLUDED.refund_status <> 'not_needed' THEN EXCLUDED.refund_status
        ELSE video_tasks.refund_status
      END,
      refund_reason = COALESCE(NULLIF(EXCLUDED.refund_reason, ''), video_tasks.refund_reason),
      request_payload = CASE
        WHEN EXCLUDED.request_payload = '{}'::jsonb THEN video_tasks.request_payload
        ELSE EXCLUDED.request_payload
      END,
      upstream_response = EXCLUDED.upstream_response,
      created_at = COALESCE(EXCLUDED.created_at, video_tasks.created_at),
      finished_at = COALESCE(EXCLUDED.finished_at, video_tasks.finished_at),
      saved_at = COALESCE(video_tasks.saved_at, EXCLUDED.saved_at),
      updated_at = NOW()
    WHERE video_tasks.user_id IS NULL
       OR EXCLUDED.user_id IS NULL
       OR video_tasks.user_id = EXCLUDED.user_id
    RETURNING
      task_id,
      generation_request_id,
      user_id,
      platform_task_id,
      status,
      model,
      prompt,
      duration,
      resolution,
      video_url,
      last_frame_url,
      credit_cost,
      billing_status,
      created_at,
      finished_at,
      saved_at;
  `;

  const values = [
    task.id,
    task.platformTaskId || null,
    task.userId || null,
    task.generationRequestId || null,
    task.status || 'queued',
    task.model || 'doubao-seedance-2-0-fast-260128',
    task.prompt || '',
    task.duration === '' || task.duration === undefined ? null : Number(task.duration),
    task.resolution || null,
    task.videoUrl || '',
    task.lastFrameUrl || '',
    Number(task.creditCost || 0),
    task.debitLedgerId || null,
    task.billingStatus || 'unbilled',
    task.refundLedgerId || null,
    task.refundStatus || 'not_needed',
    task.refundReason || '',
    JSON.stringify(safeJson(task.requestPayload || {}, 128 * 1024)),
    JSON.stringify(safeJson(task.upstreamResponse || {}, 256 * 1024)),
    task.createdAt || null,
    task.finishedAt || null,
    task.savedAt || null,
  ];

  const { rows } = await pool.query(query, values);
  return mapRow(rows[0]);
}

export async function listHistory(userId, limit = 100) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const { rows } = await pool.query(
    `SELECT
       kind,
       task_id,
       generation_request_id,
       user_id,
       platform_task_id,
       status,
       model,
       prompt,
       duration,
       resolution,
       video_url,
       image_url,
       size,
       ratio,
       style,
       last_frame_url,
       credit_cost,
       billing_status,
       created_at,
       finished_at,
       saved_at
     FROM (
       SELECT
         'video' AS kind,
         v.task_id,
         v.generation_request_id,
         v.user_id,
         v.platform_task_id,
         v.status,
         v.model,
         v.prompt,
         v.duration,
         v.resolution,
         v.video_url,
         ''::text AS image_url,
         ''::text AS size,
         ''::text AS ratio,
         ''::text AS style,
         v.last_frame_url,
         v.credit_cost,
         v.billing_status,
         v.created_at,
         v.finished_at,
         v.saved_at
       FROM video_tasks v
       WHERE v.user_id = $1
         AND v.hidden_at IS NULL

       UNION ALL

       SELECT
         'image' AS kind,
         g.id::text AS task_id,
         g.id AS generation_request_id,
         g.user_id,
         ''::text AS platform_task_id,
         g.status,
         COALESCE(i.model, g.model) AS model,
         COALESCE(i.prompt, g.prompt) AS prompt,
         NULL::integer AS duration,
         ''::text AS resolution,
         ''::text AS video_url,
         COALESCE(i.image_url, '') AS image_url,
         COALESCE(i.size, '') AS size,
         COALESCE(i.ratio, '') AS ratio,
         COALESCE(i.style, '') AS style,
         ''::text AS last_frame_url,
         g.credit_cost,
         g.billing_status,
         COALESCE(i.created_at, g.created_at) AS created_at,
         g.finished_at,
         COALESCE(i.created_at, g.created_at) AS saved_at
       FROM generation_requests g
       LEFT JOIN image_tasks i ON i.generation_request_id = g.id
       WHERE g.user_id = $1
         AND g.kind = 'image'
         AND g.hidden_at IS NULL
     ) history
     ORDER BY saved_at DESC
     LIMIT $2`,
    [userId, safeLimit],
  );
  return rows.map(mapRow);
}

export async function findTaskForUser(taskId, userId) {
  const { rows } = await pool.query(
    `SELECT task_id, generation_request_id, user_id, platform_task_id, model, prompt, status,
            duration, resolution, video_url, last_frame_url, credit_cost, billing_status,
            debit_ledger_id, refund_ledger_id, created_at, finished_at, updated_at
     FROM video_tasks
     WHERE task_id = $1
       AND user_id = $2
       AND hidden_at IS NULL
     LIMIT 1`,
    [String(taskId || '').trim(), userId],
  );
  return rows[0] || null;
}

export async function claimVideoTasksForSync({ limit = 20, leaseMs = 90_000 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safeLeaseMs = Math.min(Math.max(Number(leaseMs) || 90_000, 30_000), 300_000);
  const { rows } = await pool.query(
    `WITH candidates AS (
       SELECT task_id
       FROM video_tasks
       WHERE user_id IS NOT NULL
         AND generation_request_id IS NOT NULL
         AND hidden_at IS NULL
         AND billing_status <> 'refunded'
         AND (
           status NOT IN ('completed', 'succeeded', 'failed', 'cancelled', 'canceled', 'expired')
           OR billing_status = 'debited'
           OR (
             status IN ('completed', 'succeeded')
             AND COALESCE(video_url, '') = ''
           )
         )
         AND (sync_claimed_until IS NULL OR sync_claimed_until <= NOW())
         AND (next_check_at IS NULL OR next_check_at <= NOW())
       ORDER BY COALESCE(next_check_at, created_at), created_at
       FOR UPDATE SKIP LOCKED
       LIMIT $1
     )
     UPDATE video_tasks AS task
     SET sync_claimed_until = NOW() + ($2 * INTERVAL '1 millisecond'),
         sync_claim_id = gen_random_uuid(),
         last_checked_at = NOW(),
         updated_at = NOW()
     FROM candidates
     WHERE task.task_id = candidates.task_id
     RETURNING task.task_id,
       task.generation_request_id,
       task.user_id,
       task.platform_task_id,
       task.model,
       task.prompt,
       task.status,
       task.duration,
       task.resolution,
       task.video_url,
       task.last_frame_url,
       task.credit_cost,
       task.billing_status,
       task.debit_ledger_id,
       task.refund_ledger_id,
       task.sync_error_count,
       task.sync_claim_id
    `,
    [safeLimit, safeLeaseMs],
  );
  return rows;
}

export async function claimVideoTaskForSync({ taskId, leaseMs = 90_000 } = {}) {
  const safeLeaseMs = Math.min(Math.max(Number(leaseMs) || 90_000, 30_000), 300_000);
  const { rows } = await pool.query(
    `UPDATE video_tasks
     SET sync_claimed_until = NOW() + ($2 * INTERVAL '1 millisecond'),
         sync_claim_id = gen_random_uuid(),
         last_checked_at = NOW(),
         updated_at = NOW()
     WHERE task_id = $1
       AND hidden_at IS NULL
       AND (
         status NOT IN ('completed', 'succeeded', 'failed', 'cancelled', 'canceled', 'expired')
         OR billing_status = 'debited'
         OR (
           status IN ('completed', 'succeeded')
           AND COALESCE(video_url, '') = ''
         )
       )
       AND (sync_claimed_until IS NULL OR sync_claimed_until <= NOW())
       AND (next_check_at IS NULL OR next_check_at <= NOW())
     RETURNING task_id,
       generation_request_id,
       user_id,
       platform_task_id,
       model,
       prompt,
       status,
       duration,
       resolution,
       video_url,
       last_frame_url,
       credit_cost,
       billing_status,
       debit_ledger_id,
       refund_ledger_id,
       sync_error_count,
       sync_claim_id`,
    [String(taskId || '').trim(), safeLeaseMs],
  );
  return rows[0] || null;
}

export async function releaseVideoTaskSync({
  taskId,
  claimId = '',
  terminal = false,
  error = null,
  retryDelayMs = 5_000,
} = {}) {
  const safeDelayMs = Math.min(Math.max(Number(retryDelayMs) || 5_000, 1_000), 300_000);
  const serializedError = JSON.stringify(error ? safeError(error) : {});
  await pool.query(
    `UPDATE video_tasks
     SET sync_claimed_until = NULL,
         sync_claim_id = NULL,
         last_checked_at = NOW(),
         next_check_at = CASE
           WHEN $3 THEN NULL
           ELSE NOW() + ($4 * INTERVAL '1 millisecond')
         END,
         sync_error_count = CASE
           WHEN $3 THEN 0
           ELSE LEAST(sync_error_count + 1, 100)
         END,
         upstream_error = CASE
           WHEN $3 THEN '{}'::jsonb
           ELSE $5::jsonb
         END,
         updated_at = NOW()
     WHERE task_id = $1
       AND sync_claim_id = NULLIF($2, '')::uuid`,
    [String(taskId || ''), String(claimId || ''), Boolean(terminal), safeDelayMs, serializedError],
  );
}

export async function clearHistory(userId) {
  await withTransaction(async client => {
    await client.query(
      `UPDATE generation_requests
       SET hidden_at = COALESCE(hidden_at, NOW()), updated_at = NOW()
       WHERE user_id = $1`,
      [userId],
    );
    await client.query(
      `UPDATE video_tasks
       SET hidden_at = COALESCE(hidden_at, NOW()), updated_at = NOW()
       WHERE user_id = $1`,
      [userId],
    );
  });
  return [];
}

export async function countTasks(userId = null) {
  const query = userId
    ? 'SELECT COUNT(*)::int AS count FROM video_tasks WHERE user_id = $1 AND hidden_at IS NULL'
    : 'SELECT COUNT(*)::int AS count FROM video_tasks';
  const { rows } = await pool.query(query, userId ? [userId] : []);
  return rows[0]?.count || 0;
}
