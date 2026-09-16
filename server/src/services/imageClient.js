import { config } from '../config/env.js';
import { safeExternalText } from '../db/safeJson.js';
import { resolveApiKey } from './seedanceClient.js';
import { readResponseText } from './http.js';

const imageSizes = new Set(['auto', '1024x1024', '1536x1024', '1024x1536']);
const imageQualities = new Set(['auto', 'low', 'medium', 'high']);
const imageBackgrounds = new Set(['auto', 'opaque', 'transparent']);
const imageFormats = new Set(['png', 'jpeg', 'webp']);

const legacyRatioSizes = {
  '1:1': '1024x1024',
  '4:3': '1536x1024',
  '16:9': '1536x1024',
  '9:16': '1024x1536',
};

function ratioForSize(size) {
  return {
    auto: 'auto',
    '1024x1024': '1:1',
    '1536x1024': '3:2',
    '1024x1536': '2:3',
  }[size] || 'auto';
}

// The current upstream account exposes this model in /v1/models but has no usable image channel for it.
const unavailableImageModels = new Set(['gemini-2.5-flash-image']);

function requestHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

async function requestJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 120_000);

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body,
      signal: controller.signal,
    });
    const raw = await readResponseText(response, 12 * 1024 * 1024);
    let data = raw;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      // Preserve non-JSON upstream responses for error summaries.
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      raw,
      url,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeImageUrl(value) {
  if (!value) return '';
  if (typeof value === 'object') return normalizeImageUrl(value.url || value.href);
  return String(value).trim();
}

function dataUrlFromBase64(value) {
  const base64 = String(value || '').trim();
  if (!base64) return '';
  if (base64.startsWith('data:image/')) return base64;
  return `data:image/png;base64,${base64}`;
}

function extractImageValue(value, depth = 0) {
  if (!value || depth > 7) return null;

  if (typeof value === 'string') {
    const text = value.trim();
    if (text.startsWith('data:image/')) return { imageUrl: text, source: 'data-url' };

    try {
      const parsed = JSON.parse(text);
      return extractImageValue(parsed, depth + 1);
    } catch {
      // Continue with regex extraction.
    }

    const markdownImage = text.match(/!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/i);
    if (markdownImage?.[1]) return { imageUrl: markdownImage[1], source: 'markdown-url' };

    const url = text.match(/https?:\/\/\S+/i)?.[0]?.replace(/[),.，。]+$/, '');
    if (url) return { imageUrl: url, source: 'text-url' };
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractImageValue(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof value === 'object') {
    const url = normalizeImageUrl(value.url || value.image_url || value.imageUrl);
    if (url) return { imageUrl: url, source: 'url' };

    const base64 = value.b64_json || value.base64 || value.image_base64 || value.imageBase64;
    if (base64) return { imageUrl: dataUrlFromBase64(base64), source: 'base64' };

    for (const key of ['data', 'choices', 'message', 'content', 'output', 'result']) {
      const found = extractImageValue(value[key], depth + 1);
      if (found) return found;
    }

    for (const item of Object.values(value)) {
      const found = extractImageValue(item, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

function upstreamErrorMessage(data, raw) {
  if (data?.error?.message) return safeExternalText(data.error.message);
  if (typeof data?.error === 'string') return safeExternalText(data.error);
  if (data?.message) return safeExternalText(data.message);
  if (typeof raw === 'string' && raw.trim()) return safeExternalText(raw);
  return '';
}

function errorSummary(response, payload = {}) {
  const source = `${JSON.stringify(response?.data || {})}\n${response?.raw || ''}`;
  const message = upstreamErrorMessage(response?.data, response?.raw);
  const status = Number(response?.status || 0);

  if (/Invalid token|Unauthorized|401|api key/i.test(source)) {
    return {
      code: 'InvalidToken',
      title: '鉴权失败',
      message: '生成服务鉴权失败，请稍后重试或联系管理员。',
    };
  }

  if (/model|ModelNotOpen|not activated/i.test(source)) {
    return {
      code: 'ImageModelUnavailable',
      title: '图片模型不可用',
      message: `当前账号暂不可用 ${payload.model || config.imageModel}，请确认模型已开通。`,
    };
  }

  if (status === 402 || /"code"\s*:\s*402\b|payment required|no available channels|insufficient balance/i.test(source)) {
    return {
      code: 'ImageChannelUnavailable',
      title: '图片模型暂不可用',
      message: `当前账号或分组暂时没有 ${payload.model || config.imageModel} 的可用图片通道。请切换到 gpt-image 2.5 重试；本次失败任务的积分已自动退回。`,
    };
  }

  return {
    code: `HTTP_${status || 500}`,
    title: '图片生成失败',
    message: message || `图片接口返回 HTTP ${status || 500}。`,
  };
}

function shouldTryChatFallback(response) {
  const source = `${JSON.stringify(response?.data || {})}\n${response?.raw || ''}`;
  if ([404, 405].includes(Number(response?.status))) return true;
  return Number(response?.status) === 400 && /(unsupported|not found|unknown endpoint|images\/generations)/i.test(source);
}

function shouldTryImageFallback(response) {
  const source = `${JSON.stringify(response?.data || {})}\n${response?.raw || ''}`;
  if ([404, 405].includes(Number(response?.status))) return true;
  return Number(response?.status) === 400
    && /(unsupported|not found|unknown endpoint|chat\/completions)/i.test(source);
}

function isChatFirstImageModel(model) {
  return /^gemini-/i.test(String(model || '').trim());
}

function imageGenerationRequest(apiKey, payload, prompt) {
  const body = {
    model: payload.model,
    prompt,
    n: 1,
    size: payload.size,
    quality: payload.quality,
    background: payload.background,
    output_format: payload.outputFormat,
  };

  if (payload.outputFormat !== 'png') {
    body.output_compression = payload.outputCompression;
  }

  return requestJson(`${config.drawBaseUrl}/v1/images/generations`, {
    method: 'POST',
    headers: requestHeaders(apiKey),
    body: JSON.stringify(body),
    timeoutMs: 120_000,
  });
}

function chatCompletionRequest(apiKey, payload, prompt) {
  return requestJson(`${config.drawBaseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: requestHeaders(apiKey),
    body: JSON.stringify({
      model: payload.model,
      stream: false,
      messages: [
        { role: 'system', content: 'You are a helpful image generation assistant. Return the generated image result.' },
        { role: 'user', content: prompt },
      ],
    }),
    timeoutMs: 120_000,
  });
}

export function normalizeImagePayload(input = {}) {
  const prompt = String(input.prompt || '').trim();
  if (!prompt) {
    const error = new Error('请先填写图片提示词。');
    error.status = 400;
    throw error;
  }

  const model = String(input.model || config.imageModel || 'gpt-image-2.5').trim();
  const rawSize = String(input.size || '').trim();
  const size = imageSizes.has(rawSize)
    ? rawSize
    : legacyRatioSizes[input.ratio] || 'auto';
  const outputFormat = imageFormats.has(String(input.outputFormat || input.output_format || '').trim().toLowerCase())
    ? String(input.outputFormat || input.output_format).trim().toLowerCase()
    : 'png';
  const quality = imageQualities.has(String(input.quality || '').trim())
    ? String(input.quality).trim()
    : 'auto';
  const requestedBackground = String(input.background || '').trim();
  const background = imageBackgrounds.has(requestedBackground)
    ? (requestedBackground === 'transparent' && outputFormat === 'jpeg' ? 'opaque' : requestedBackground)
    : 'auto';
  const rawCompression = Number(input.outputCompression ?? input.output_compression);
  const outputCompression = Number.isFinite(rawCompression)
    ? Math.min(100, Math.max(0, Math.round(rawCompression)))
    : 100;

  return {
    model,
    prompt,
    size,
    ratio: ratioForSize(size),
    quality,
    background,
    outputFormat,
    outputCompression,
  };
}

export function isImageModelAvailable(model) {
  return !unavailableImageModels.has(String(model || '').trim());
}

export function imageModelUnavailableError(model) {
  const name = String(model || config.imageModel).trim();
  const error = new Error(
    `当前账号或分组暂时没有 ${name} 的可用图片通道，请切换到 gpt-image 2.5 重试。`,
  );
  error.status = 503;
  error.code = 'IMAGE_CHANNEL_UNAVAILABLE';
  error.expose = true;
  return error;
}

export function buildImagePrompt(payload) {
  return payload.prompt;
}

export async function createImage(apiKey, payload) {
  const key = resolveApiKey(apiKey);
  if (!key) throw new Error('生成服务暂未配置，请联系管理员。');

  const prompt = buildImagePrompt(payload);
  let response;

  if (isChatFirstImageModel(payload.model)) {
    response = await chatCompletionRequest(key, payload, prompt);
    if (!response.ok && shouldTryImageFallback(response)) {
      response = await imageGenerationRequest(key, payload, prompt);
    }
  } else {
    response = await imageGenerationRequest(key, payload, prompt);
    if (!response.ok && shouldTryChatFallback(response)) {
      response = await chatCompletionRequest(key, payload, prompt);
    }
  }

  if (!response.ok) {
    return {
      ...response,
      error: errorSummary(response, payload),
    };
  }

  const extracted = extractImageValue(response.data);
  if (!extracted?.imageUrl) {
    return {
      ...response,
      ok: false,
      status: 502,
      error: {
        code: 'ImageResultMissing',
        title: '图片结果缺失',
        message: '图片接口已返回，但没有找到可展示的图片地址或 base64 数据。',
      },
    };
  }

  const revisedPrompt = response.data?.data?.[0]?.revised_prompt || response.data?.revised_prompt || '';
  return {
    ...response,
    data: null,
    raw: '',
    result: {
      imageUrl: extracted.imageUrl,
      source: extracted.source,
      model: payload.model,
      size: payload.size,
      ratio: payload.ratio,
      quality: payload.quality,
      background: payload.background,
      outputFormat: payload.outputFormat,
      outputCompression: payload.outputCompression,
      prompt: payload.prompt,
      revisedPrompt,
      createdAt: new Date().toISOString(),
    },
    error: null,
  };
}
