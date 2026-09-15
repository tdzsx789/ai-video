import { pool } from './pool.js';

function persistedUrl(value) {
  const url = String(value || '').trim();
  return /^https?:\/\//i.test(url) ? url.slice(0, 20_000) : '';
}

export async function upsertImageTask({
  generationRequestId,
  userId,
  payload,
  result,
}) {
  const imageUrl = persistedUrl(result?.imageUrl);
  const { rows } = await pool.query(
    `INSERT INTO image_tasks (
       generation_request_id, user_id, model, prompt, style, ratio, size,
       image_url, source, revised_prompt
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (generation_request_id) DO UPDATE SET
       image_url = COALESCE(NULLIF(EXCLUDED.image_url, ''), image_tasks.image_url),
       source = EXCLUDED.source,
       revised_prompt = EXCLUDED.revised_prompt,
       updated_at = NOW()
     RETURNING *`,
    [
      generationRequestId,
      userId,
      String(payload?.model || '').slice(0, 255),
      String(payload?.prompt || '').slice(0, 20_000),
      String(payload?.style || '').slice(0, 80),
      String(payload?.ratio || '').slice(0, 20),
      String(payload?.size || '').slice(0, 40),
      imageUrl,
      String(result?.source || '').slice(0, 80),
      String(result?.revisedPrompt || '').slice(0, 20_000),
    ],
  );
  return mapImageTask(rows[0]);
}

export async function getImageTaskForUser(generationRequestId, userId) {
  const { rows } = await pool.query(
    `SELECT *
     FROM image_tasks
     WHERE generation_request_id = $1
       AND user_id = $2
     LIMIT 1`,
    [generationRequestId, userId],
  );
  return mapImageTask(rows[0]);
}

function mapImageTask(row) {
  if (!row) return null;
  return {
    generationRequestId: row.generation_request_id,
    userId: row.user_id,
    model: row.model,
    prompt: row.prompt,
    style: row.style,
    ratio: row.ratio,
    size: row.size,
    imageUrl: row.image_url || '',
    source: row.source || '',
    revisedPrompt: row.revised_prompt || '',
    createdAt: row.created_at?.toISOString?.() || row.created_at || '',
  };
}

export { persistedUrl };
