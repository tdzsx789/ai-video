import crypto from 'node:crypto';
import { pool } from './pool.js';
import { withTransaction } from './transaction.js';
import { debitForGeneration, getBalance, refundGeneration } from './creditRepository.js';
import { safeError, safeJson } from './safeJson.js';
import { httpError } from '../utils/httpError.js';

function normalizeIdempotencyKey(value) {
  const candidate = String(value || '').trim();
  if (candidate) return candidate.slice(0, 128);
  return crypto.randomUUID();
}

function requestFingerprint({ kind, model, prompt, payload }) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({ kind, model, prompt, payload }))
    .digest('hex');
}

function mapGeneration(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    idempotencyKey: row.idempotency_key,
    status: row.status,
    model: row.model,
    prompt: row.prompt,
    creditCost: Number(row.credit_cost || 0),
    billingStatus: row.billing_status,
    debitLedgerId: row.debit_ledger_id || null,
    refundLedgerId: row.refund_ledger_id || null,
    externalTaskId: row.external_task_id || '',
    resultUrl: row.result_url || '',
    resultMetadata: row.result_metadata || {},
    error: row.error || {},
    createdAt: row.created_at?.toISOString?.() || row.created_at || '',
    submittedAt: row.submitted_at?.toISOString?.() || row.submitted_at || '',
    finishedAt: row.finished_at?.toISOString?.() || row.finished_at || '',
  };
}

const generationColumns = `
  id, user_id, kind, idempotency_key, status, model, prompt,
  credit_cost, billing_status, debit_ledger_id, refund_ledger_id,
  external_task_id, result_url, result_metadata, error,
  created_at, submitted_at, finished_at
`;

export async function reserveGeneration({
  userId,
  kind,
  model,
  prompt,
  creditCost,
  payload,
  idempotencyKey,
}) {
  const key = normalizeIdempotencyKey(idempotencyKey);
  const fingerprint = requestFingerprint({ kind, model, prompt, payload });
  return withTransaction(async client => {
    const { rows: insertedRows } = await client.query(
      `INSERT INTO generation_requests (
         user_id, kind, idempotency_key, status, model, prompt,
         request_fingerprint, credit_cost, billing_status, request_payload
       )
       VALUES ($1, $2, $3, 'submitting', $4, $5, $6, $7, 'unbilled', $8::jsonb)
       ON CONFLICT (user_id, kind, idempotency_key) DO NOTHING
       RETURNING ${generationColumns}`,
      [
        userId,
        kind,
        key,
        String(model || '').slice(0, 255),
        String(prompt || '').slice(0, 20_000),
        fingerprint,
        Math.max(0, Number(creditCost) || 0),
        JSON.stringify(safeJson(payload || {}, 128 * 1024)),
      ],
    );
    if (!insertedRows[0]) {
      const { rows: existingRows } = await client.query(
        `SELECT ${generationColumns}, request_fingerprint
         FROM generation_requests
         WHERE user_id = $1
           AND kind = $2
           AND idempotency_key = $3
         FOR UPDATE`,
        [userId, kind, key],
      );
      if (existingRows[0]?.request_fingerprint && existingRows[0].request_fingerprint !== fingerprint) {
        throw httpError(409, '相同请求编号对应的生成内容不一致，请更换请求编号。', {
          code: 'IDEMPOTENCY_KEY_REUSED',
        });
      }
      return {
        created: false,
        generation: mapGeneration(existingRows[0]),
        balance: await getBalance(userId, client),
        idempotencyKey: key,
      };
    }

    const generation = insertedRows[0];
    const debit = await debitForGeneration(client, {
      userId,
      generationId: generation.id,
      kind,
      amount: creditCost,
      model,
    });
    const { rows: updatedRows } = await client.query(
      `UPDATE generation_requests
       SET billing_status = 'debited',
           debit_ledger_id = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING ${generationColumns}`,
      [generation.id, debit.ledgerId],
    );

    return {
      created: true,
      generation: mapGeneration(updatedRows[0]),
      balance: debit.balance,
      idempotencyKey: key,
    };
  });
}

export async function markGenerationSubmitted({
  userId,
  generationId,
  externalTaskId,
}) {
  const { rows } = await pool.query(
    `UPDATE generation_requests
     SET status = 'submitted',
         external_task_id = COALESCE(NULLIF($3, ''), external_task_id),
         submitted_at = COALESCE(submitted_at, NOW()),
         updated_at = NOW()
     WHERE id = $1
       AND user_id = $2
     RETURNING ${generationColumns}`,
    [generationId, userId, String(externalTaskId || '').slice(0, 255)],
  );
  return mapGeneration(rows[0]);
}

export async function markGenerationUnknown({ userId, generationId, error }) {
  const { rows } = await pool.query(
    `UPDATE generation_requests
     SET status = 'unknown',
         error = $3::jsonb,
         updated_at = NOW()
     WHERE id = $1
       AND user_id = $2
       AND status NOT IN ('completed', 'failed', 'refunded', 'cancelled')
     RETURNING ${generationColumns}`,
    [generationId, userId, JSON.stringify(safeError(error))],
  );
  return mapGeneration(rows[0]);
}

export async function settleGeneration({
  userId,
  generationId,
  resultUrl = '',
  resultMetadata = {},
  status = 'completed',
}) {
  return withTransaction(async client => {
    const { rows } = await client.query(
      `SELECT ${generationColumns}
       FROM generation_requests
       WHERE id = $1
         AND user_id = $2
       FOR UPDATE`,
      [generationId, userId],
    );
    if (!rows[0]) throw httpError(404, '生成请求不存在。');
    if (rows[0].billing_status === 'refunded') {
      return { generation: mapGeneration(rows[0]), balance: await getBalance(userId, client) };
    }

    const { rows: updatedRows } = await client.query(
      `UPDATE generation_requests
       SET status = $3,
           billing_status = 'settled',
           result_url = LEFT($4, 20_000),
           result_metadata = $5::jsonb,
           finished_at = COALESCE(finished_at, NOW()),
           updated_at = NOW()
       WHERE id = $1
         AND user_id = $2
       RETURNING ${generationColumns}`,
      [generationId, userId, status, String(resultUrl || ''), JSON.stringify(safeJson(resultMetadata, 64 * 1024))],
    );
    await client.query(
      `UPDATE video_tasks
       SET billing_status = 'settled',
           refund_status = 'not_needed',
           updated_at = NOW()
       WHERE generation_request_id = $1
         AND user_id = $2`,
      [generationId, userId],
    );
    return {
      generation: mapGeneration(updatedRows[0]),
      balance: await getBalance(userId, client),
    };
  });
}

export async function failGeneration({
  userId,
  generationId,
  kind,
  reason,
  amount,
}) {
  const refund = await refundGeneration({
    userId,
    generationId,
    kind,
    amount,
    reason,
  });
  const { rows } = await pool.query(
    `SELECT ${generationColumns}
     FROM generation_requests
     WHERE id = $1
       AND user_id = $2
     LIMIT 1`,
    [generationId, userId],
  );
  return { generation: mapGeneration(rows[0]), balance: refund.balance };
}

export async function getGenerationForUser(generationId, userId) {
  const { rows } = await pool.query(
    `SELECT ${generationColumns}
     FROM generation_requests
     WHERE id = $1
       AND user_id = $2
     LIMIT 1`,
    [generationId, userId],
  );
  return mapGeneration(rows[0]);
}

export { normalizeIdempotencyKey, requestFingerprint };
