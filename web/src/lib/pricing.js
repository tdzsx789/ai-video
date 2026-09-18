const MIN_VIDEO_SECONDS = 5;

export const VIDEO_PRICING_RULES = Object.freeze({
  'doubao-seedance-2-5-260628': Object.freeze({ type: 'per_second', creditsPerSecond: 100, minSeconds: MIN_VIDEO_SECONDS }),
  'doubao-seedance-2-0-fast-260128': Object.freeze({ type: 'per_second', creditsPerSecond: 80, minSeconds: MIN_VIDEO_SECONDS }),
  'doubao-seedance-2-0-mini-260615': Object.freeze({ type: 'per_second', creditsPerSecond: 40, minSeconds: MIN_VIDEO_SECONDS }),
  'MiniMax-Hailuo-2.3-Fast/768p/6s': Object.freeze({ type: 'per_run', credits: 200, seconds: 6 }),
  'MiniMax-Hailuo-2.3-Fast/768p/10s': Object.freeze({ type: 'per_run', credits: 300, seconds: 10 }),
  'MiniMax-Hailuo-2.3-Fast/1080p/6s': Object.freeze({ type: 'per_run', credits: 300, seconds: 6 }),
});

export const IMAGE_PRICING_RULES = Object.freeze({
  'gpt-image-2.5': Object.freeze({ type: 'per_run', credits: 20 }),
  'gpt-image-2.5-sunburst': Object.freeze({ type: 'per_run', credits: 50 }),
});

function normalizedModel(value) {
  return String(value || '').trim();
}

function billableSeconds(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed === -1) return MIN_VIDEO_SECONDS;
  return Math.max(MIN_VIDEO_SECONDS, Math.ceil(parsed));
}

export function getVideoPricingRule(model) {
  return VIDEO_PRICING_RULES[normalizedModel(model)] || null;
}

export function getImagePricingRule(model) {
  return IMAGE_PRICING_RULES[normalizedModel(model)] || null;
}

export function calculateVideoGenerationCost(form = {}) {
  const rule = getVideoPricingRule(form.model);
  if (!rule) return null;
  if (rule.type === 'per_run') return rule.credits;
  return billableSeconds(form.duration) * rule.creditsPerSecond;
}

export function calculateImageGenerationCost(form = {}) {
  const rule = getImagePricingRule(form.model);
  return rule?.credits ?? null;
}
