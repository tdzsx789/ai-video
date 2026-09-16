import { pool } from './pool.js';
import { withTransaction } from './transaction.js';
import { safeJson } from './safeJson.js';
import { httpError } from '../utils/httpError.js';

const CREDIT_TYPES = {
  video: { debit: 'video_debit', refund: 'video_refund' },
  image: { debit: 'image_debit', refund: 'image_refund' },
};

function numberValue(value) {
  const parsed = Number(value || 0);
  return Number.isSafeInteger(parsed) ? parsed : 0;
}

function mapBalance(row) {
  return numberValue(row?.balance);
}

export async function getBalance(userId, client = pool) {
  const { rows } = await client.query(
    `SELECT balance
     FROM credit_accounts
     WHERE user_id = $1`,
    [userId],
  );
  return mapBalance(rows[0]);
}

export async function getCreditSnapshot(userId) {
  const { rows } = await pool.query(
    `SELECT balance, updated_at
     FROM credit_accounts
     WHERE user_id = $1`,
    [userId],
  );
  return {
    balance: mapBalance(rows[0]),
    updatedAt: rows[0]?.updated_at?.toISOString?.() || rows[0]?.updated_at || '',
  };
}

function mapLedgerRow(row) {
  return {
    id: String(row?.id || ''),
    type: row?.type || '',
    amountDelta: numberValue(row?.amount_delta),
    balanceAfter: numberValue(row?.balance_after),
    referenceType: row?.reference_type || '',
    referenceId: row?.reference_id || '',
    description: row?.description || '',
    createdAt: row?.created_at?.toISOString?.() || row?.created_at || '',
  };
}

function mapRechargeRow(row) {
  return {
    id: String(row?.id || ''),
    planId: row?.plan_id || '',
    credits: numberValue(row?.credits),
    amountCents: numberValue(row?.amount_cents),
    currency: row?.currency || 'CNY',
    status: row?.status || '',
    provider: row?.provider || '',
    paidAt: row?.paid_at?.toISOString?.() || row?.paid_at || '',
    createdAt: row?.created_at?.toISOString?.() || row?.created_at || '',
  };
}

function normalizedLimit(value, fallback = 20) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), 1), 50);
}

export async function listCreditLedger(userId, { limit } = {}) {
  const { rows } = await pool.query(
    `SELECT id, type, amount_delta, balance_after, reference_type, reference_id, description, created_at
     FROM credit_ledger
     WHERE user_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT $2`,
    [userId, normalizedLimit(limit)],
  );
  return rows.map(mapLedgerRow);
}

export async function listRechargeOrders(userId, { limit } = {}) {
  const { rows } = await pool.query(
    `SELECT id, plan_id, credits, amount_cents, currency, status, provider, paid_at, created_at
     FROM recharge_orders
     WHERE user_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT $2`,
    [userId, normalizedLimit(limit)],
  );
  return rows.map(mapRechargeRow);
}

export async function debitForGeneration(client, {
  userId,
  generationId,
  kind,
  amount,
  model,
}) {
  const cost = Math.max(0, numberValue(amount));
  if (!cost) return { balance: await getBalance(userId, client), ledgerId: null };

  const { rows } = await client.query(
    `UPDATE credit_accounts
     SET balance = balance - $2,
         updated_at = NOW()
     WHERE user_id = $1
       AND balance >= $2
     RETURNING balance`,
    [userId, cost],
  );
  if (!rows[0]) {
    const balance = await getBalance(userId, client);
    throw httpError(402, `积分不足，本次生成需要 ${cost} 积分，当前余额 ${balance}。`, {
      code: 'INSUFFICIENT_CREDITS',
      balance,
      required: cost,
    });
  }

  const type = CREDIT_TYPES[kind]?.debit;
  const { rows: ledgerRows } = await client.query(
    `INSERT INTO credit_ledger (
       user_id, type, amount_delta, balance_after, idempotency_key,
       reference_type, reference_id, description, metadata
     )
     VALUES ($1, $2, $3, $4, $5, 'generation_request', $6, $7, $8::jsonb)
     RETURNING id`,
    [
      userId,
      type,
      -cost,
      rows[0].balance,
      `generation-debit:${generationId}`,
      generationId,
      `${kind === 'video' ? '视频' : '图片'}生成扣除积分`,
      JSON.stringify(safeJson({ kind, model, amount: cost }, 8 * 1024)),
    ],
  );

  return {
    balance: mapBalance(rows[0]),
    ledgerId: ledgerRows[0]?.id || null,
  };
}

export async function refundGeneration({
  userId,
  generationId,
  kind,
  amount,
  reason,
}) {
  return withTransaction(async client => {
    const { rows } = await client.query(
      `SELECT id, credit_cost, billing_status, refund_ledger_id
       FROM generation_requests
       WHERE id = $1
         AND user_id = $2
       FOR UPDATE`,
      [generationId, userId],
    );
    const generation = rows[0];
    if (!generation) throw httpError(404, '生成请求不存在。');
    if (generation.billing_status === 'refunded' || generation.refund_ledger_id) {
      return { balance: await getBalance(userId, client), ledgerId: generation.refund_ledger_id };
    }
    if (generation.billing_status !== 'debited') {
      return { balance: await getBalance(userId, client), ledgerId: null };
    }

    const refundAmount = Math.max(0, numberValue(amount || generation.credit_cost));
    const { rows: balanceRows } = await client.query(
      `UPDATE credit_accounts
       SET balance = balance + $2,
           updated_at = NOW()
       WHERE user_id = $1
       RETURNING balance`,
      [userId, refundAmount],
    );
    if (!balanceRows[0]) throw httpError(500, '积分账户不存在。');

    const type = CREDIT_TYPES[kind]?.refund || 'adjustment';
    const { rows: ledgerRows } = await client.query(
      `INSERT INTO credit_ledger (
         user_id, type, amount_delta, balance_after, idempotency_key,
         reference_type, reference_id, description, metadata
       )
       VALUES ($1, $2, $3, $4, $5, 'generation_request', $6, $7, $8::jsonb)
       ON CONFLICT (idempotency_key) DO UPDATE SET id = credit_ledger.id
       RETURNING id`,
      [
        userId,
        type,
        refundAmount,
        balanceRows[0].balance,
        `generation-refund:${generationId}`,
        generationId,
        '生成失败退还积分',
        JSON.stringify(safeJson({ reason: String(reason || '').slice(0, 500) }, 8 * 1024)),
      ],
    );
    await client.query(
      `UPDATE generation_requests
       SET billing_status = 'refunded',
           status = 'refunded',
           refund_ledger_id = $3,
           error = $4::jsonb,
           finished_at = COALESCE(finished_at, NOW()),
           updated_at = NOW()
       WHERE id = $1
         AND user_id = $2`,
      [generationId, userId, ledgerRows[0]?.id || null, JSON.stringify(safeJson({ reason }, 8 * 1024))],
    );
    await client.query(
      `UPDATE video_tasks
       SET billing_status = 'refunded',
           refund_status = 'refunded',
           refund_ledger_id = $3,
           refund_reason = LEFT($4, 500),
           updated_at = NOW()
       WHERE generation_request_id = $1
         AND user_id = $2`,
      [generationId, userId, ledgerRows[0]?.id || null, String(reason || '')],
    );

    return { balance: mapBalance(balanceRows[0]), ledgerId: ledgerRows[0]?.id || null };
  });
}

export async function rechargeCredits({ userId, plan, paymentMethod = 'wechat', idempotencyKey }) {
  return withTransaction(async client => {
    const { rows: orderRows } = await client.query(
      `INSERT INTO recharge_orders (
         user_id, idempotency_key, plan_id, credits, amount_cents,
         status, provider, provider_order_id, paid_at, metadata
       )
       VALUES ($1, $2, $3, $4, $5, 'paid', 'dev', $7, NOW(), $6::jsonb)
       ON CONFLICT (user_id, idempotency_key) DO NOTHING
       RETURNING id, credits, amount_cents, status, paid_at, created_at`,
      [
        userId,
        idempotencyKey,
        plan.id,
        plan.credits,
        plan.amountCents,
        JSON.stringify(safeJson({ planId: plan.id, paymentMethod, mock: true }, 8 * 1024)),
        `dev:${userId}:${idempotencyKey}`,
      ],
    );

    if (!orderRows[0]) {
      const { rows: existingRows } = await client.query(
        `SELECT id, credits, amount_cents, status, paid_at, created_at
         FROM recharge_orders
         WHERE user_id = $1 AND idempotency_key = $2
         LIMIT 1`,
        [userId, idempotencyKey],
      );
      return {
        balance: await getBalance(userId, client),
        order: existingRows[0] || null,
        duplicate: true,
      };
    }

    const { rows: balanceRows } = await client.query(
      `UPDATE credit_accounts
       SET balance = balance + $2,
           updated_at = NOW()
       WHERE user_id = $1
       RETURNING balance`,
      [userId, plan.credits],
    );
    if (!balanceRows[0]) throw httpError(500, '积分账户不存在。');

    const { rows: ledgerRows } = await client.query(
      `INSERT INTO credit_ledger (
         user_id, type, amount_delta, balance_after, idempotency_key,
         reference_type, reference_id, description, metadata
       )
       VALUES ($1, 'recharge', $2, $3, $4, 'recharge_order', $5, $6, $7::jsonb)
       RETURNING id`,
      [
        userId,
        plan.credits,
        balanceRows[0].balance,
        `recharge:${orderRows[0].id}`,
        orderRows[0].id,
        `模拟充值 ${plan.credits} 积分`,
        JSON.stringify(safeJson({
          planId: plan.id,
          amountCents: plan.amountCents,
          paymentMethod,
          mock: true,
        }, 8 * 1024)),
      ],
    );
    await client.query(
      `UPDATE recharge_orders
       SET ledger_id = $2, updated_at = NOW()
       WHERE id = $1`,
      [orderRows[0].id, ledgerRows[0]?.id || null],
    );

    return {
      balance: mapBalance(balanceRows[0]),
      order: orderRows[0],
      duplicate: false,
    };
  });
}
