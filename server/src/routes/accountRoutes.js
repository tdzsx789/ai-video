import { Router } from 'express';
import {
  findUserById,
  revokeOtherSessions,
  updateUserPassword,
  updateUserProfile,
} from '../db/authRepository.js';
import {
  getCreditSnapshot,
  listCreditLedger,
  listRechargeOrders,
  rechargeCredits,
} from '../db/creditRepository.js';
import { requireAuth } from '../middleware/auth.js';
import { hashPassword, verifyPasswordAsync } from '../services/password.js';
import { getRechargePlan } from '../services/pricing.js';
import { httpError } from '../utils/httpError.js';

export const accountRouter = Router();
accountRouter.use(requireAuth);

accountRouter.get('/credits', async (req, res, next) => {
  try {
    res.json({ ok: true, credits: await getCreditSnapshot(req.user.id) });
  } catch (error) {
    next(error);
  }
});

accountRouter.get('/credit-records', async (req, res, next) => {
  try {
    const [credits, ledger, recharges] = await Promise.all([
      getCreditSnapshot(req.user.id),
      listCreditLedger(req.user.id, { limit: req.query?.limit }),
      listRechargeOrders(req.user.id, { limit: req.query?.limit }),
    ]);
    res.json({ ok: true, credits, ledger, recharges });
  } catch (error) {
    next(error);
  }
});

accountRouter.post('/recharge', async (req, res, next) => {
  try {
    const plan = getRechargePlan(req.body?.planId, { amount: req.body?.amount });
    if (!plan) throw httpError(400, '充值金额无效，最低 10 元。', { code: 'INVALID_RECHARGE_PLAN' });
    const paymentMethod = ['wechat', 'alipay', 'card'].includes(req.body?.paymentMethod)
      ? req.body.paymentMethod
      : 'wechat';
    const idempotencyKey = String(
      req.get('Idempotency-Key') || req.body?.idempotencyKey || '',
    ).trim().slice(0, 128);
    if (!idempotencyKey) throw httpError(400, '缺少充值请求编号。', { code: 'IDEMPOTENCY_KEY_REQUIRED' });

    const result = await rechargeCredits({
      userId: req.user.id,
      plan,
      paymentMethod,
      idempotencyKey,
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
});

accountRouter.patch('/profile', async (req, res, next) => {
  try {
    const email = req.body?.email === undefined ? undefined : String(req.body.email).trim();
    const phone = req.body?.phone === undefined ? undefined : normalizePhone(req.body.phone);
    if (email !== undefined && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw httpError(400, '请输入有效的邮箱地址。', { code: 'INVALID_EMAIL' });
    }
    const user = await updateUserProfile(req.user.id, {
      name: req.body?.name,
      email,
      phone,
    });
    res.json({ ok: true, user });
  } catch (error) {
    if (error.code === '23505') {
      error.status = 409;
      error.message = error.constraint?.includes('phone')
        ? '手机号已被其他账户使用。'
        : '邮箱已被其他账户使用。';
    }
    next(error);
  }
});

accountRouter.post('/password/verify', async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.currentPassword || '');
    if (!currentPassword) {
      throw httpError(400, '请输入当前密码。', { code: 'PASSWORD_REQUIRED' });
    }

    const user = await findUserById(req.user.id);
    const valid = user?.status === 'active'
      ? await verifyPasswordAsync(currentPassword, user.password_hash)
      : false;
    if (!valid) {
      throw httpError(400, '当前密码不正确。', { code: 'INVALID_CURRENT_PASSWORD' });
    }

    res.json({ ok: true, verified: true });
  } catch (error) {
    next(error);
  }
});

accountRouter.post('/password', async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    if (!currentPassword || !newPassword) {
      throw httpError(400, '请输入当前密码和新密码。', { code: 'PASSWORD_REQUIRED' });
    }
    if (newPassword.length < 8 || newPassword.length > 200) {
      throw httpError(400, '新密码需要至少 8 位字符。', { code: 'INVALID_NEW_PASSWORD' });
    }
    if (currentPassword === newPassword) {
      throw httpError(400, '新密码不能与当前密码相同。', { code: 'PASSWORD_UNCHANGED' });
    }

    const user = await findUserById(req.user.id);
    const valid = user?.status === 'active'
      ? await verifyPasswordAsync(currentPassword, user.password_hash)
      : false;
    if (!valid) {
      throw httpError(400, '当前密码不正确。', { code: 'INVALID_CURRENT_PASSWORD' });
    }

    await updateUserPassword(req.user.id, hashPassword(newPassword));
    await revokeOtherSessions(req.user.id, req.authToken);
    res.json({ ok: true, message: '密码已更新，其他登录会话已退出。' });
  } catch (error) {
    next(error);
  }
});

function normalizePhone(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = raw.replace(/[^\d+]/g, '');
  if (!/^\+?\d{6,20}$/.test(normalized)) {
    throw httpError(400, '请输入有效的手机号。', { code: 'INVALID_PHONE' });
  }
  return normalized;
}
