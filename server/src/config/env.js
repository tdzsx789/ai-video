import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function normalizeDrawBaseUrl(value) {
  return String(value || 'https://draw.openai-next.com')
    .replace(/\/+$/, '')
    .replace(/\/v1$/i, '');
}

export const config = {
  port: Number(process.env.PORT || 8787),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://seedance:seedance_dev@localhost:5434/seedance',
  openaiNextApiKey: process.env.OPENAI_NEXT_API_KEY || '',
  drawBaseUrl: normalizeDrawBaseUrl(process.env.DRAW_BASE_URL),
  imageModel: process.env.IMAGE_MODEL || 'gpt-image-2.5',
  webOrigin: process.env.WEB_ORIGIN || 'http://127.0.0.1:5180',
  nodeEnv: process.env.NODE_ENV || 'development',
};
