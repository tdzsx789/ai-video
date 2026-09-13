export const schemaSql = `
CREATE TABLE IF NOT EXISTS video_tasks (
  task_id TEXT PRIMARY KEY,
  platform_task_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  model TEXT NOT NULL,
  prompt TEXT NOT NULL,
  duration INTEGER,
  resolution TEXT,
  video_url TEXT,
  last_frame_url TEXT,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  upstream_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS video_tasks_saved_at_idx
  ON video_tasks (saved_at DESC);

CREATE INDEX IF NOT EXISTS video_tasks_status_idx
  ON video_tasks (status);
`;
