import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config/env.js';
import { countTasks, pool } from './db/index.js';
import { historyRouter } from './routes/historyRoutes.js';
import { modelRouter } from './routes/modelRoutes.js';
import { videoRouter } from './routes/videoRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(__dirname, '../../web/dist');

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ ok: true, database: 'connected', storedTasks: await countTasks() });
    } catch (error) {
      res.status(503).json({ ok: false, database: 'disconnected', error: error.message });
    }
  });

  app.use('/api/history', historyRouter);
  app.use('/api/models', modelRouter);
  app.use('/api', videoRouter);

  app.use(express.static(webDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(webDist, 'index.html'), error => {
      if (error && !res.headersSent) {
        res.status(404).json({
          ok: false,
          error: '前端尚未构建，请运行 npm run build。',
        });
      }
    });
  });

  app.use((error, _req, res, _next) => {
    console.error('请求失败:', error.stack || error.message);
    res.status(error.status || 500).json({
      ok: false,
      error: error.message || '服务器内部错误。',
    });
  });

  return app;
}
