import { createServer } from 'node:http';
import { config } from './config/env.js';
import { pool } from './db/pool.js';
import { schemaSql } from './db/schema.js';
import { seedMockAccounts } from './db/seed.js';
import { createApp } from './app.js';
import { startVideoSyncWorker } from './services/videoSyncWorker.js';

try {
  await pool.query(schemaSql);
  await seedMockAccounts();
  const app = createApp();
  const server = createServer(app);
  const stopVideoSync = startVideoSyncWorker();

  server.listen(config.port, config.host, () => {
    console.log(`Seedance Studio API 已启动：http://${config.host}:${config.port}`);
  });

  const shutdown = async signal => {
    console.log(`收到 ${signal}，正在关闭服务...`);
    stopVideoSync();
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
