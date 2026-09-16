import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function normalizeDrawBaseUrl(value) {
  return String(value || 'https://draw.openai-next.com')
    .replace(/\/+$/, '')
    .replace(/\/v1$/i, '');
}

export const config = {
  port: Number(process.env.PORT || 8787),
  host: process.env.HOST || '127.0.0.1',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://seedance:seedance_dev@localhost:5434/seedance',
  dbPoolMax: Math.min(Math.max(Number(process.env.DB_POOL_MAX || 20), 2), 50),
  dbQueryTimeoutMs: Math.min(Math.max(Number(process.env.DB_QUERY_TIMEOUT_MS || 10_000), 1_000), 60_000),
  videoSyncIntervalMs: Math.min(Math.max(Number(process.env.VIDEO_SYNC_INTERVAL_MS || 5_000), 1_000), 60_000),
  videoSyncBatchSize: Math.min(Math.max(Number(process.env.VIDEO_SYNC_BATCH_SIZE || 20), 1), 100),
  videoSyncConcurrency: Math.min(Math.max(Number(process.env.VIDEO_SYNC_CONCURRENCY || 4), 1), 20),
  videoSyncLeaseMs: Math.min(Math.max(Number(process.env.VIDEO_SYNC_LEASE_MS || 90_000), 30_000), 300_000),
  openaiNextApiKey: process.env.OPENAI_NEXT_API_KEY || '',
  drawBaseUrl: normalizeDrawBaseUrl(process.env.DRAW_BASE_URL),
  imageModel: process.env.IMAGE_MODEL || 'gpt-image-2.5',
  webOrigin: process.env.WEB_ORIGIN || 'http://127.0.0.1:5180',
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionCookieSecure: /^(1|true|yes|on)$/i.test(
    process.env.SESSION_COOKIE_SECURE || (process.env.NODE_ENV === 'production' ? '1' : '0'),
  ),
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'ai_jinchan_session',
  sessionTtlMs: Math.min(
    Math.max(Number(process.env.SESSION_TTL_MS || 7 * 24 * 60 * 60 * 1000), 60 * 60 * 1000),
    30 * 24 * 60 * 60 * 1000,
  ),
};
