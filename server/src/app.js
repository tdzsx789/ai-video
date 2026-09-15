import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config/env.js';
import { countTasks, pool } from './db/index.js';
import { authRouter } from './routes/authRoutes.js';
import { accountRouter } from './routes/accountRoutes.js';
import { historyRouter } from './routes/historyRoutes.js';
import { imageRouter } from './routes/imageRoutes.js';
import { modelRouter } from './routes/modelRoutes.js';
import { videoRouter } from './routes/videoRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(__dirname, '../../web/dist');

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: config.webOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ ok: true, database: 'connected', storedTasks: await countTasks() });
    } catch (error) {
      console.error('健康检查失败:', error.message);
      res.status(503).json({ ok: false, database: 'disconnected', error: '数据库暂时不可用。' });
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/account', accountRouter);
  app.use('/api/history', historyRouter);
  app.use('/api/images', imageRouter);
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
    const status = Number(error.status) >= 400 && Number(error.status) < 600 ? Number(error.status) : 500;
    const expose = Boolean(error.expose) || status < 500;
    if (status >= 500) console.error('请求失败:', error.stack || error.message);
    res.status(status).json({
      ok: false,
      error: expose ? (error.message || '请求失败。') : '服务器内部错误。',
      ...(expose && error.details ? { details: error.details } : {}),
    });
  });

  return app;
}
