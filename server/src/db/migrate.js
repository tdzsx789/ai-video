import { pool } from './pool.js';
import { schemaSql } from './schema.js';

try {
  await pool.query(schemaSql);
  console.log('PostgreSQL 数据表已就绪。');
} catch (error) {
  console.error('数据库迁移失败:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
