import { Router } from 'express';
import { config } from '../config/env.js';
import {
  createSession,
  findUserByUsername,
  revokeSession,
} from '../db/authRepository.js';
import { getCreditSnapshot } from '../db/creditRepository.js';
import { verifyPasswordAsync } from '../services/password.js';
import { expiredSessionCookie, requireAuth, sessionCookie, sessionTokenFromRequest } from '../middleware/auth.js';
import { httpError } from '../utils/httpError.js';

export const authRouter = Router();

function credentialsFromBody(body = {}) {
  return {
    username: String(body.username || '').trim(),
    password: String(body.password || ''),
  };
}

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const credits = await getCreditSnapshot(req.user.id);
    res.json({ ok: true, user: req.user, credits });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { username, password } = credentialsFromBody(req.body);
    if (!/^[A-Za-z0-9._-]{3,64}$/.test(username) || password.length < 1 || password.length > 200) {
      throw httpError(400, '请输入正确的账号和密码。', { code: 'INVALID_CREDENTIALS' });
    }

    const user = await findUserByUsername(username);
    const valid = user?.status === 'active'
      ? await verifyPasswordAsync(password, user.password_hash)
      : false;
    if (!valid) throw httpError(401, '账号或密码错误。', { code: 'INVALID_CREDENTIALS' });

    const session = await createSession(user.id, config.sessionTtlMs);
    const credits = await getCreditSnapshot(user.id);
    res.setHeader('Set-Cookie', sessionCookie(session.token, session.expiresAt));
    res.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        createdAt: user.created_at?.toISOString?.() || user.created_at || '',
      },
      credits,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    await revokeSession(sessionTokenFromRequest(req));
    res.setHeader('Set-Cookie', expiredSessionCookie());
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
