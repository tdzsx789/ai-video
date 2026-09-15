export const GENERATION_COSTS = Object.freeze({
  video: 30,
  image: 12,
});

export const RECHARGE_PLANS = Object.freeze({
  starter: Object.freeze({ id: 'starter', credits: 300, amountCents: 990 }),
  creator: Object.freeze({ id: 'creator', credits: 1200, amountCents: 2990 }),
  studio: Object.freeze({ id: 'studio', credits: 5000, amountCents: 9900 }),
});

export function getRechargePlan(planId) {
  return RECHARGE_PLANS[String(planId || '')] || null;
}
