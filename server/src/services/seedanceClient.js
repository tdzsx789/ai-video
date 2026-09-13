import { config } from '../config/env.js';

const terminalStatuses = new Set(['completed', 'succeeded', 'failed', 'cancelled', 'canceled', 'expired']);

function decodeMaybeJson(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const candidates = [trimmed, trimmed.replace(/^not ok match:\s*/i, '').trim()];
  for (const candidate of candidates) {
    if (!candidate || !['{', '['].includes(candidate[0])) continue;
    try {
      return JSON.parse(candidate);
    } catch {
      // Upstream sometimes wraps JSON inside a text error.
    }
  }
  return null;
}

function deepDecode(value, depth = 0) {
  if (depth > 6 || value === null || value === undefined) return value;
  if (typeof value === 'string') {
    const decoded = decodeMaybeJson(value);
    return decoded === null ? value : deepDecode(decoded, depth + 1);
  }
  if (Array.isArray(value)) return value.map(item => deepDecode(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, deepDecode(item, depth + 1)]));
  }
  return value;
}

function findErrorNode(value) {
  if (!value || typeof value !== 'object') return null;
  if ((typeof value.code === 'string' || typeof value.code === 'number')
    && (typeof value.message === 'string' || typeof value.description === 'string')) {
    return value;
  }
  for (const child of Object.values(value)) {
    const found = findErrorNode(child);
    if (found) return found;
  }
  return null;
}

function requestIdFrom(value) {
  const match = String(value || '').match(/Request id:\s*([A-Za-z0-9]+)/i);
  return match?.[1] || '';
}

function errorSummary(response, payload = {}) {
  const decoded = deepDecode(response?.data);
  const source = `${JSON.stringify(decoded)}\n${response?.raw || ''}`;
  const node = findErrorNode(decoded);
  const code = String(node?.code || '').trim();
  const message = String(node?.message || node?.description || '').trim();

  if (/ModelNotOpen|has not activated the model/i.test(source)) {
    return {
      code: 'ModelNotOpen',
      title: '模型未开通',
      message: `当前账号还没有开通 ${payload.model || '该模型'}，请先在 Ark Console 开通模型服务。`,
      requestId: requestIdFrom(source),
    };
  }
  if (/Invalid token|Unauthorized|401/i.test(source)) {
    return {
      code: 'InvalidToken',
      title: '鉴权失败',
      message: 'API Key 无效或已失效，请检查服务端环境变量。',
      requestId: requestIdFrom(source),
    };
  }
  if (/MissingParameter/i.test(source)) {
    return {
      code: 'MissingParameter',
      title: '缺少参数',
      message: '请求参数不完整，请检查提示词、模型和视频时长。',
      requestId: requestIdFrom(source),
    };
  }

  return code || message
    ? { code: code || 'UpstreamError', title: '上游请求失败', message: message || '上游接口返回了错误。', requestId: requestIdFrom(source) }
    : { code: `HTTP_${response?.status || 500}`, title: '请求失败', message: `上游接口返回 HTTP ${response?.status || 500}。`, requestId: requestIdFrom(source) };
}

async function requestJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 60_000);
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body,
      signal: controller.signal,
    });
    const raw = await response.text();
    let data = raw;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      // Keep non-JSON upstream responses as raw text.
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

function headers(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

export function resolveApiKey(apiKey) {
  return String(apiKey || config.openaiNextApiKey || '').trim();
}

export async function createVideoTask(apiKey, payload) {
  const key = resolveApiKey(apiKey);
  if (!key) throw new Error('缺少 API Key，请在页面输入或配置 OPENAI_NEXT_API_KEY。');
  const response = await requestJson(`${config.drawBaseUrl}/v1/video/generations`, {
    method: 'POST',
    headers: headers(key),
    body: JSON.stringify(payload),
    timeoutMs: 60_000,
  });
  return {
    ...response,
    error: response.ok ? null : errorSummary(response, payload),
  };
}

export async function queryVideoTask(apiKey, taskId) {
  const key = resolveApiKey(apiKey);
  if (!key) throw new Error('缺少 API Key，请在页面输入或配置 OPENAI_NEXT_API_KEY。');
  const url = `${config.drawBaseUrl}/v1/tasks/${encodeURIComponent(taskId)}`;
  const response = await requestJson(url, {
    headers: headers(key),
    timeoutMs: 30_000,
  });
  return {
    ...response,
    terminal: terminalStatuses.has(String(response.data?.status || '').toLowerCase()),
    error: response.ok ? null : errorSummary(response),
  };
}
