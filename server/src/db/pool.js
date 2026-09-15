import pg from 'pg';
import { config } from '../config/env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.dbPoolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  query_timeout: config.dbQueryTimeoutMs,
  statement_timeout: config.dbQueryTimeoutMs,
  idle_in_transaction_session_timeout: config.dbQueryTimeoutMs,
  keepAlive: true,
  maxUses: 5_000,
});

pool.on('error', error => {
  console.error('PostgreSQL 连接池错误:', error.message);
});
