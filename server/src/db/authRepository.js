import { pool } from './pool.js';
import { hashToken, randomToken } from '../services/password.js';

function normalizedUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    email: row.email,
    createdAt: row.created_at?.toISOString?.() || row.created_at || '',
  };
}

export async function findUserByUsername(username) {
  const normalized = normalizedUsername(username);
  if (!normalized) return null;

  const { rows } = await pool.query(
    `SELECT id, username, name, email, password_hash, status, created_at
     FROM users
     WHERE username_normalized = $1
     LIMIT 1`,
    [normalized],
  );
  return rows[0] || null;
}

export async function findSessionUser(token) {
  const tokenHash = hashToken(token);
  if (!tokenHash) return null;

  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.name, u.email, u.created_at
     FROM auth_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.revoked_at IS NULL
       AND s.expires_at > NOW()
       AND u.status = 'active'
     LIMIT 1`,
    [tokenHash],
  );
  return mapUser(rows[0]);
}

export async function createSession(userId, ttlMs) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + ttlMs);
  await pool.query(
    `DELETE FROM auth_sessions
     WHERE expires_at < NOW()
        OR revoked_at < NOW() - INTERVAL '30 days'`,
  );
  await pool.query(
    `INSERT INTO auth_sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, hashToken(token), expiresAt],
  );
  return { token, expiresAt };
}

export async function revokeSession(token) {
  if (!token) return;
  await pool.query(
    `UPDATE auth_sessions
     SET revoked_at = COALESCE(revoked_at, NOW())
     WHERE token_hash = $1`,
    [hashToken(token)],
  );
}

export async function updateUserProfile(userId, { name, email }) {
  const hasName = name !== undefined && name !== null;
  const hasEmail = email !== undefined && email !== null;
  const nextName = hasName ? String(name).trim().slice(0, 80) : null;
  const nextEmail = hasEmail ? String(email).trim().slice(0, 255) : null;
  const emailNormalized = nextEmail?.toLowerCase() || null;
  const { rows } = await pool.query(
    `UPDATE users
     SET name = COALESCE(NULLIF($2, ''), name),
         email = COALESCE(NULLIF($3, ''), email),
         email_normalized = COALESCE(NULLIF($4, ''), email_normalized),
         updated_at = NOW()
     WHERE id = $1
       AND status = 'active'
     RETURNING id, username, name, email, created_at`,
    [userId, nextName, nextEmail, emailNormalized],
  );
  return mapUser(rows[0]);
}

export { mapUser };
