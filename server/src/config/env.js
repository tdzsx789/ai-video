import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: Number(process.env.PORT || 8787),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://seedance:seedance_dev@localhost:5434/seedance',
  openaiNextApiKey: process.env.OPENAI_NEXT_API_KEY || '',
  drawBaseUrl: (process.env.DRAW_BASE_URL || 'https://draw.openai-next.com').replace(/\/+$/, ''),
  webOrigin: process.env.WEB_ORIGIN || 'http://127.0.0.1:5180',
  nodeEnv: process.env.NODE_ENV || 'development',
};
