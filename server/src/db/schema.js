export const schemaSql = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (email_normalized = lower(trim(email_normalized)))
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_normalized_idx
  ON users (email_normalized);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_sessions_token_hash_idx
  ON auth_sessions (token_hash);

CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx
  ON auth_sessions (user_id);

CREATE TABLE IF NOT EXISTS credit_accounts (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (balance >= 0)
);

CREATE TABLE IF NOT EXISTS credit_ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount_delta BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  idempotency_key TEXT NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (amount_delta <> 0),
  CHECK (balance_after >= 0),
  CHECK (type IN ('welcome_grant', 'video_debit', 'video_refund', 'recharge', 'adjustment'))
);

CREATE UNIQUE INDEX IF NOT EXISTS credit_ledger_idempotency_key_idx
  ON credit_ledger (idempotency_key);

CREATE INDEX IF NOT EXISTS credit_ledger_user_created_at_idx
  ON credit_ledger (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS recharge_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  credits BIGINT NOT NULL,
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CNY',
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT 'dev',
  provider_order_id TEXT,
  ledger_id BIGINT REFERENCES credit_ledger(id),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CHECK (credits > 0),
  CHECK (amount_cents >= 0),
  CHECK (status IN ('pending', 'paid', 'cancelled', 'expired', 'failed'))
);

CREATE INDEX IF NOT EXISTS recharge_orders_user_created_at_idx
  ON recharge_orders (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS recharge_orders_provider_order_idx
  ON recharge_orders (provider, provider_order_id)
  WHERE provider_order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS video_tasks (
  task_id TEXT PRIMARY KEY,
  client_request_id TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  platform_task_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  model TEXT NOT NULL,
  prompt TEXT NOT NULL,
  duration INTEGER,
  resolution TEXT,
  video_url TEXT,
  last_frame_url TEXT,
  credit_cost BIGINT NOT NULL DEFAULT 0,
  debit_ledger_id BIGINT REFERENCES credit_ledger(id),
  refund_ledger_id BIGINT REFERENCES credit_ledger(id),
  billing_status TEXT NOT NULL DEFAULT 'unbilled',
  refund_status TEXT NOT NULL DEFAULT 'not_needed',
  refund_reason TEXT NOT NULL DEFAULT '',
  upstream_error JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  upstream_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  hidden_at TIMESTAMPTZ,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (credit_cost >= 0),
  CHECK (billing_status IN ('unbilled', 'debited', 'settled', 'refunded')),
  CHECK (refund_status IN ('not_needed', 'pending', 'refunded', 'failed'))
);

ALTER TABLE video_tasks ADD COLUMN IF NOT EXISTS client_request_id TEXT;
ALTER TABLE video_tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE video_tasks ADD COLUMN IF NOT EXISTS credit_cost BIGINT NOT NULL DEFAULT 0;
ALTER TABLE video_tasks ADD COLUMN IF NOT EXISTS debit_ledger_id BIGINT REFERENCES credit_ledger(id);
ALTER TABLE video_tasks ADD COLUMN IF NOT EXISTS refund_ledger_id BIGINT REFERENCES credit_ledger(id);
ALTER TABLE video_tasks ADD COLUMN IF NOT EXISTS billing_status TEXT NOT NULL DEFAULT 'unbilled';
ALTER TABLE video_tasks ADD COLUMN IF NOT EXISTS refund_status TEXT NOT NULL DEFAULT 'not_needed';
ALTER TABLE video_tasks ADD COLUMN IF NOT EXISTS refund_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE video_tasks ADD COLUMN IF NOT EXISTS upstream_error JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE video_tasks ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;
ALTER TABLE video_tasks ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS video_tasks_saved_at_idx
  ON video_tasks (saved_at DESC);

CREATE INDEX IF NOT EXISTS video_tasks_status_idx
  ON video_tasks (status);

CREATE INDEX IF NOT EXISTS video_tasks_user_saved_at_idx
  ON video_tasks (user_id, saved_at DESC);

CREATE INDEX IF NOT EXISTS video_tasks_user_status_idx
  ON video_tasks (user_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS video_tasks_client_request_id_idx
  ON video_tasks (client_request_id)
  WHERE client_request_id IS NOT NULL;
`;
