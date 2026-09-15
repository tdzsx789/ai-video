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
    phone: row.phone || '',
    createdAt: row.created_at?.toISOString?.() || row.created_at || '',
  };
}

export async function findUserByUsername(username) {
  const normalized = normalizedUsername(username);
  if (!normalized) return null;

  const { rows } = await pool.query(
    `SELECT id, username, name, email, phone, password_hash, status, created_at
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
    `SELECT u.id, u.username, u.name, u.email, u.phone, u.created_at
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

export async function findUserById(userId) {
  const { rows } = await pool.query(
    `SELECT id, password_hash, status
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

export async function updateUserProfile(userId, { name, email, phone }) {
  const hasName = name !== undefined && name !== null;
  const hasEmail = email !== undefined && email !== null;
  const hasPhone = phone !== undefined && phone !== null;
  const nextName = hasName ? String(name).trim().slice(0, 80) : null;
  const nextEmail = hasEmail ? String(email).trim().slice(0, 255) : null;
  const nextPhone = hasPhone ? String(phone).trim().slice(0, 30) : null;
  const emailNormalized = nextEmail?.toLowerCase() || null;
  const assignments = [];
  const values = [userId];

  if (hasName) {
    assignments.push(`name = COALESCE(NULLIF($${values.length + 1}, ''), name)`);
    values.push(nextName);
  }
  if (hasEmail) {
    assignments.push(`email = COALESCE(NULLIF($${values.length + 1}, ''), email)`);
    values.push(nextEmail);
    assignments.push(`email_normalized = COALESCE(NULLIF($${values.length + 1}, ''), email_normalized)`);
    values.push(emailNormalized);
  }
  if (hasPhone) {
    assignments.push(`phone = $${values.length + 1}`);
    values.push(nextPhone || '');
    assignments.push(`phone_normalized = $${values.length + 1}`);
    values.push(nextPhone || '');
  }

  if (!assignments.length) {
    const { rows } = await pool.query(
      `SELECT id, username, name, email, phone, created_at
       FROM users
       WHERE id = $1 AND status = 'active'`,
      [userId],
    );
    return mapUser(rows[0]);
  }

  const { rows } = await pool.query(
    `UPDATE users
     SET ${assignments.join(', ')},
         updated_at = NOW()
     WHERE id = $1
       AND status = 'active'
     RETURNING id, username, name, email, phone, created_at`,
    values,
  );
  return mapUser(rows[0]);
}

export async function updateUserPassword(userId, passwordHash) {
  await pool.query(
    `UPDATE users
     SET password_hash = $2, updated_at = NOW()
     WHERE id = $1 AND status = 'active'`,
    [userId, passwordHash],
  );
}

export async function revokeOtherSessions(userId, currentToken) {
  await pool.query(
    `UPDATE auth_sessions
     SET revoked_at = COALESCE(revoked_at, NOW())
     WHERE user_id = $1
       AND token_hash <> $2
       AND revoked_at IS NULL`,
    [userId, hashToken(currentToken)],
  );
}

export { mapUser };
