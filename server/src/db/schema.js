export const schemaSql = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  username_normalized TEXT NOT NULL,
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (username_normalized = lower(trim(username_normalized))),
  CHECK (email_normalized = lower(trim(email_normalized))),
  CHECK (status IN ('active', 'disabled'))
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS username_normalized TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
UPDATE users
SET username = COALESCE(NULLIF(trim(username), ''), split_part(email, '@', 1))
WHERE username IS NULL OR trim(username) = '';
UPDATE users
SET username_normalized = lower(trim(username))
WHERE username_normalized IS NULL OR trim(username_normalized) = '';
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
ALTER TABLE users ALTER COLUMN username_normalized SET NOT NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_normalized_check;
ALTER TABLE users ADD CONSTRAINT users_username_normalized_check
  CHECK (username_normalized = lower(trim(username_normalized)));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_normalized_check;
ALTER TABLE users ADD CONSTRAINT users_email_normalized_check
  CHECK (email_normalized = lower(trim(email_normalized)));

CREATE UNIQUE INDEX IF NOT EXISTS users_email_normalized_idx
  ON users (email_normalized);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_normalized_idx
  ON users (username_normalized);

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

CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx
  ON auth_sessions (expires_at);

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
  CHECK (type IN ('welcome_grant', 'video_debit', 'video_refund', 'image_debit', 'image_refund', 'recharge', 'adjustment'))
);

ALTER TABLE credit_ledger DROP CONSTRAINT IF EXISTS credit_ledger_type_check;
ALTER TABLE credit_ledger ADD CONSTRAINT credit_ledger_type_check
  CHECK (type IN ('welcome_grant', 'video_debit', 'video_refund', 'image_debit', 'image_refund', 'recharge', 'adjustment'));

CREATE UNIQUE INDEX IF NOT EXISTS credit_ledger_idempotency_key_idx
  ON credit_ledger (idempotency_key);

CREATE INDEX IF NOT EXISTS credit_ledger_user_created_at_idx
  ON credit_ledger (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS generation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved',
  model TEXT NOT NULL,
  prompt TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL DEFAULT '',
  credit_cost BIGINT NOT NULL DEFAULT 0,
  billing_status TEXT NOT NULL DEFAULT 'unbilled',
  debit_ledger_id BIGINT REFERENCES credit_ledger(id),
  refund_ledger_id BIGINT REFERENCES credit_ledger(id),
  external_task_id TEXT,
  result_url TEXT NOT NULL DEFAULT '',
  result_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  error JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  upstream_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  hidden_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (kind IN ('video', 'image')),
  CHECK (status IN ('reserved', 'submitting', 'submitted', 'completed', 'failed', 'refunded', 'unknown', 'cancelled')),
  CHECK (credit_cost >= 0),
  CHECK (billing_status IN ('unbilled', 'debited', 'settled', 'refunded'))
);

ALTER TABLE generation_requests ADD COLUMN IF NOT EXISTS kind TEXT;
ALTER TABLE generation_requests ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE generation_requests ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'reserved';
ALTER TABLE generation_requests ADD COLUMN IF NOT EXISTS model TEXT NOT NULL DEFAULT '';
ALTER TABLE generation_requests ADD COLUMN IF NOT EXISTS prompt TEXT NOT NULL DEFAULT '';
ALTER TABLE generation_requests ADD COLUMN IF NOT EXISTS request_fingerprint TEXT NOT NULL DEFAULT '';
ALTER TABLE generation_requests ADD COLUMN IF NOT EXISTS credit_cost BIGINT NOT NULL DEFAULT 0;
ALTER TABLE generation_requests ADD COLUMN IF NOT EXISTS billing_status TEXT NOT NULL DEFAULT 'unbilled';
ALTER TABLE generation_requests ADD COLUMN IF NOT EXISTS debit_ledger_id BIGINT REFERENCES credit_ledger(id);
ALTER TABLE generation_requests ADD COLUMN IF NOT EXISTS refund_ledger_id BIGINT REFERENCES credit_ledger(id);
ALTER TABLE generation_requests ADD COLUMN IF NOT EXISTS external_task_id TEXT;
ALTER TABLE generation_requests ADD COLUMN IF NOT EXISTS result_url TEXT NOT NULL DEFAULT '';
ALTER TABLE generation_requests ADD COLUMN IF NOT EXISTS result_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE generation_requests ADD COLUMN IF NOT EXISTS error JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE generation_requests ADD COLUMN IF NOT EXISTS request_payload JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE generation_requests ADD COLUMN IF NOT EXISTS upstream_response JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE generation_requests ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE generation_requests ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;
ALTER TABLE generation_requests ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;
ALTER TABLE generation_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS generation_requests_user_kind_key_idx
  ON generation_requests (user_id, kind, idempotency_key);

CREATE INDEX IF NOT EXISTS generation_requests_user_created_at_idx
  ON generation_requests (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS generation_requests_user_visible_created_at_idx
  ON generation_requests (user_id, created_at DESC)
  WHERE hidden_at IS NULL;

CREATE INDEX IF NOT EXISTS generation_requests_external_task_idx
  ON generation_requests (kind, external_task_id)
  WHERE external_task_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS recharge_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idempotency_key TEXT,
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

ALTER TABLE recharge_orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
UPDATE recharge_orders
SET idempotency_key = 'legacy-recharge-' || id::text
WHERE idempotency_key IS NULL OR trim(idempotency_key) = '';
ALTER TABLE recharge_orders ALTER COLUMN idempotency_key SET NOT NULL;

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
ALTER TABLE video_tasks ADD COLUMN IF NOT EXISTS generation_request_id UUID REFERENCES generation_requests(id) ON DELETE SET NULL;
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

CREATE INDEX IF NOT EXISTS video_tasks_user_visible_saved_at_idx
  ON video_tasks (user_id, saved_at DESC)
  WHERE hidden_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS video_tasks_client_request_id_idx
  ON video_tasks (client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS video_tasks_generation_request_idx
  ON video_tasks (generation_request_id);

CREATE UNIQUE INDEX IF NOT EXISTS recharge_orders_user_idempotency_idx
  ON recharge_orders (user_id, idempotency_key);

CREATE TABLE IF NOT EXISTS image_tasks (
  generation_request_id UUID PRIMARY KEY REFERENCES generation_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  prompt TEXT NOT NULL,
  style TEXT NOT NULL DEFAULT '',
  ratio TEXT NOT NULL DEFAULT '',
  size TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  revised_prompt TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS image_tasks_user_created_at_idx
  ON image_tasks (user_id, created_at DESC);
`;
