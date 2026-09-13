const defaultModel = 'doubao-seedance-2-0-fast-260128';

function integer(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

export function normalizeVideoPayload(input = {}) {
  const prompt = String(input.prompt || '').trim();
  if (!prompt) throw new Error('请先填写提示词。');

  const duration = Math.min(Math.max(integer(input.duration, 5), 1), 30);
  const resolution = String(input.resolution || '720P').trim();
  const promptExtend = input.promptExtend ?? input.prompt_extend ?? true;

  return {
    model: String(input.model || defaultModel).trim(),
    prompt,
    duration,
    metadata: {
      parameters: {
        resolution,
        prompt_extend: Boolean(promptExtend),
      },
    },
  };
}
