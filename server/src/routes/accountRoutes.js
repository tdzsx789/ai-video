import { Router } from 'express';
import { getCreditSnapshot, rechargeCredits } from '../db/creditRepository.js';
import { updateUserProfile } from '../db/authRepository.js';
import { requireAuth } from '../middleware/auth.js';
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

accountRouter.post('/recharge', async (req, res, next) => {
  try {
    const plan = getRechargePlan(req.body?.planId);
    if (!plan) throw httpError(400, '充值套餐无效。', { code: 'INVALID_RECHARGE_PLAN' });
    const idempotencyKey = String(
      req.get('Idempotency-Key') || req.body?.idempotencyKey || '',
    ).trim().slice(0, 128);
    if (!idempotencyKey) throw httpError(400, '缺少充值请求编号。', { code: 'IDEMPOTENCY_KEY_REQUIRED' });

    const result = await rechargeCredits({
      userId: req.user.id,
      plan,
      idempotencyKey,
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
});

accountRouter.patch('/profile', async (req, res, next) => {
  try {
    const user = await updateUserProfile(req.user.id, {
      name: req.body?.name,
      email: req.body?.email,
    });
    res.json({ ok: true, user });
  } catch (error) {
    if (error.code === '23505') {
      error.status = 409;
      error.message = '邮箱已被其他账户使用。';
    }
    next(error);
  }
});
