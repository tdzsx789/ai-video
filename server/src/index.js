import { createServer } from 'node:http';
import { config } from './config/env.js';
import { pool } from './db/pool.js';
import { schemaSql } from './db/schema.js';
import { createApp } from './app.js';

try {
  await pool.query(schemaSql);
  const app = createApp();
  const server = createServer(app);

  server.listen(config.port, '127.0.0.1', () => {
    console.log(`Seedance Studio API 已启动：http://127.0.0.1:${config.port}`);
  });

  const shutdown = async signal => {
    console.log(`收到 ${signal}，正在关闭服务...`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
} catch (error) {
  console.error('服务启动失败:', error.message);
  console.error('请先启动 PostgreSQL，并执行 npm run db:migrate。');
  process.exitCode = 1;
}
