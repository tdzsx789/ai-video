#!/usr/bin/env node
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { setTimeout: sleep } = require('node:timers/promises');

const DRAW_BASE = 'https://draw.openai-next.com';
const DEFAULT_MODEL = 'doubao-seedance-2-0-fast-260128';
const DEFAULT_PORT = Number(process.env.PORT || 8787);
const HTML_FILE = path.join(__dirname, 'seedance-debug.html');
const HISTORY_FILE = path.join(__dirname, 'seedance-history.json');
const HISTORY_LIMIT = 100;
const TERMINAL_STATUSES = new Set(['completed', 'succeeded', 'failed', 'cancelled', 'canceled', 'expired']);

function parseArgs(argv) {
  const args = {
    _: [],
    serve: false,
    poll: true,
    interval: 5000,
    timeout: 30 * 60 * 1000,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--serve' || token === '-s') {
      args.serve = true;
      continue;
    }
    if (token === '--no-poll') {
      args.poll = false;
      continue;
    }
    if (token === '--poll') {
      args.poll = true;
      continue;
    }
    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i += 1;
      } else {
        args[key] = true;
      }
      continue;
    }
    args._.push(token);
  }

  return args;
}

function printHelp() {
  console.log(`
Seedance 调试工具

用法:
  node server/seedance-debug.js --serve
  node server/seedance-debug.js --api-key sk-... --prompt "你好" [参数]

参数:
  --api-key <密钥>
  --model <模型>
  --prompt <提示词>
  --duration <秒>
  --resolution <分辨率>
  --prompt-extend true|false
  --metadata <JSON>
  --models
  --poll / --no-poll
  --interval <毫秒>
  --timeout <毫秒>
  --serve
`);
}

function decodeMaybeJson(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const stripped = trimmed.replace(/^not ok match:\s*/i, '').trim();
  const candidates = [trimmed, stripped];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const first = candidate[0];
    if (first !== '{' && first !== '[') continue;
    try {
      return JSON.parse(candidate);
    } catch {
      // ignore
    }
  }
  return null;
}

function extractPromptText(input) {
  if (typeof input?.prompt === 'string' && input.prompt.trim()) {
    return input.prompt.trim();
  }

  if (Array.isArray(input?.content)) {
    const textItem = input.content.find(item => item && item.type === 'text' && typeof item.text === 'string' && item.text.trim());
    if (textItem) return textItem.text.trim();
  }

  return '';
}

function extractTaskId(data) {
  if (!data || typeof data !== 'object') return '';
  return String(data.id || data.task_id || data.taskId || data.output?.task_id || data.output?.taskId || '').trim();
}

function extractTaskStatus(data) {
  if (!data || typeof data !== 'object') return '';
  return String(
    data.status
    || data.task_status
    || data.result?.data?.status
    || data.output?.task_status
    || data.output?.status
    || ''
  ).trim().toLowerCase();
}

function extractVideoUrl(data) {
  if (!data || typeof data !== 'object') return '';
  return String(
    data.result_url
    || data.video_url
    || data.result?.data?.content?.video_url
    || data.output?.video_url
    || data.output?.videoUrl
    || data.output?.url
    || ''
  ).trim();
}

function deepDecode(value, depth = 0) {
  if (depth > 6 || value === null || value === undefined) return value;
  if (typeof value === 'string') {
    const decoded = decodeMaybeJson(value);
    return decoded === null ? value : deepDecode(decoded, depth + 1);
  }
  if (Array.isArray(value)) {
    return value.map(item => deepDecode(item, depth + 1));
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = deepDecode(item, depth + 1);
    }
    return out;
  }
  return value;
}

function findErrorNode(value) {
  if (!value || typeof value !== 'object') return null;
  if (typeof value.code === 'string' || typeof value.code === 'number') {
    if (typeof value.message === 'string' || typeof value.description === 'string') {
      return value;
    }
  }
  for (const item of Object.values(value)) {
    const found = findErrorNode(item);
    if (found) return found;
  }
  return null;
}

function extractRequestId(text) {
  if (typeof text !== 'string') return '';
  const match = text.match(/Request id:\s*([A-Za-z0-9]+)/i) || text.match(/request id:\s*([A-Za-z0-9]+)/i);
  return match ? match[1] : '';
}

function summarizeApiError(response, payload) {
  const rawText = typeof response?.raw === 'string' ? response.raw : '';
  const decoded = deepDecode(response?.data);
  const errorNode = findErrorNode(decoded);
  const sourceText = JSON.stringify(decoded) + '\n' + rawText;
  const modelName = payload?.model || '';
  const requestId = extractRequestId(rawText) || extractRequestId(JSON.stringify(decoded));
  const code = String(errorNode?.code || '').trim();
  const message = String(errorNode?.message || errorNode?.description || response?.data?.message || '').trim();

  if (/ModelNotOpen/i.test(sourceText) || /has not activated the model/i.test(sourceText)) {
    return {
      code: 'ModelNotOpen',
      title: '模型未开通',
      message: modelName
        ? `当前账号还没有开通 ${modelName}，请先到 Ark Console 开通后再试。`
        : '当前账号还没有开通该模型，请先到 Ark Console 开通后再试。',
      request_id: requestId,
    };
  }

  if (/MissingParameter/i.test(sourceText)) {
    return {
      code: 'MissingParameter',
      title: '缺少参数',
      message: '请求参数不完整，请检查模型、提示词、时长和参考素材是否已经填写。',
      request_id: requestId,
    };
  }

  if (/Invalid token/i.test(sourceText)) {
    return {
      code: 'InvalidToken',
      title: '鉴权失败',
      message: 'API Key 无效或已失效，请检查当前填写的密钥。',
      request_id: requestId,
    };
  }

  if (/QuotaExceeded/i.test(sourceText)) {
    return {
      code: 'QuotaExceeded',
      title: '额度已满',
      message: '当前账号排队任务已达上限，请稍后重试。',
      request_id: requestId,
    };
  }

  if (code || message) {
    return {
      code: code || 'UnknownError',
      title: '请求失败',
      message: message || '上游接口返回了错误。',
      request_id: requestId,
    };
  }

  return null;
}

function readJsonBody(req, limitBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      size += Buffer.byteLength(chunk);
      if (size > limitBytes) {
        reject(new Error('请求体过大'));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error(`JSON 请求体无效：${err.message}`));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload, null, 2));
}

function sendText(res, statusCode, text, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, {
    'content-type': contentType,
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
  });
  res.end(text);
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseNumber(value, fallback = undefined) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseInteger(value, fallback = undefined) {
  const n = parseNumber(value, fallback);
  if (n === undefined) return fallback;
  const int = Math.trunc(n);
  return Number.isFinite(int) ? int : fallback;
}

function parseJsonObject(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function toIsoTime(value) {
  if (value === undefined || value === null || value === '') return '';
  const n = Number(value);
  const date = Number.isFinite(n)
    ? new Date(n > 1000000000000 ? n : n * 1000)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function readHistory() {
  try {
    const text = fs.readFileSync(HISTORY_FILE, 'utf8');
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.data)) return parsed.data;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`读取历史记录失败：${err.message}`);
    }
  }
  return [];
}

function writeHistory(history) {
  const normalized = Array.isArray(history) ? history.slice(0, HISTORY_LIMIT) : [];
  fs.writeFileSync(HISTORY_FILE, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  return normalized;
}

function clearHistory() {
  writeHistory([]);
  return [];
}

function extractTaskInput(task) {
  return parseJsonObject(task?.properties?.input)
    || parseJsonObject(task?.properties?.submit)
    || {};
}

function buildHistoryEntry(task) {
  const resultData = task?.result?.data || {};
  const input = extractTaskInput(task);
  const ratios = task?.properties?.ratios || {};
  const duration = input.duration ?? resultData.duration ?? ratios.duration ?? '';
  const resolution = input.metadata?.parameters?.resolution || resultData.resolution || ratios.resolution || '';

  return {
    id: extractTaskId(task),
    platformTaskId: String(resultData.task_id || resultData.output?.task_id || '').trim(),
    status: extractTaskStatus(task),
    model: String(input.model || task?.properties?.model || resultData.model || task?.model || '').trim(),
    prompt: String(input.prompt || resultData.prompt || '').trim(),
    duration,
    resolution: String(resolution || '').trim(),
    videoUrl: extractVideoUrl(task),
    createdAt: toIsoTime(task?.created ?? task?.submit_time ?? resultData.created_at),
    finishedAt: toIsoTime(task?.finish_time ?? resultData.updated_at),
    savedAt: new Date().toISOString(),
  };
}

function saveCompletedTaskToHistory(task) {
  const status = extractTaskStatus(task);
  const videoUrl = extractVideoUrl(task);
  if (!videoUrl || !['completed', 'succeeded'].includes(status)) return null;

  const entry = buildHistoryEntry(task);
  const history = readHistory();
  const existingIndex = history.findIndex(item => {
    return (entry.id && item.id === entry.id) || (entry.videoUrl && item.videoUrl === entry.videoUrl);
  });
  if (existingIndex >= 0) {
    const [existing] = history.splice(existingIndex, 1);
    history.unshift({ ...existing, ...entry, savedAt: existing.savedAt || entry.savedAt });
  } else {
    history.unshift(entry);
  }
  writeHistory(history);
  return entry;
}

async function requestJson(url, options) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 30000;
  const timeout = setTimeout(() => controller.abort(new Error('请求超时')), timeoutMs);
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body,
      signal: controller.signal,
    });
    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';
    let parsed = text;
    if (text && (contentType.includes('application/json') || /^[\[{]/.test(text.trim()))) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    return {
      ok: response.ok,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data: parsed,
      raw: text,
      url,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function isHtmlLike(text) {
  if (typeof text !== 'string') return false;
  const trimmed = text.trim().toLowerCase();
  return trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html') || trimmed.includes('<body');
}

async function apiCall(apiKey, url, method, body, timeoutMs) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  const request = {
    method,
    headers,
    timeoutMs,
  };
  if (body !== undefined) {
    request.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  return requestJson(url, request);
}

async function createTask(apiKey, payload) {
  const url = `${DRAW_BASE}/v1/video/generations`;
  return apiCall(apiKey, url, 'POST', payload, 60000);
}

async function probeTaskQuery(apiKey, id, timeoutMs = 30000) {
  const encodedId = encodeURIComponent(id);
  const candidates = [
    { method: 'GET', url: `${DRAW_BASE}/v1/tasks/${encodedId}` },
  ];

  const attempts = [];
  let lastErrorAttempt = null;
  for (const candidate of candidates) {
    const result = await apiCall(apiKey, candidate.url, candidate.method, candidate.body, timeoutMs);
    attempts.push({
      method: candidate.method,
      url: candidate.url,
      status: result.status,
      ok: result.ok,
      contentType: result.headers['content-type'] || '',
      data: result.data,
      raw: result.raw,
    });

    if (result.ok && result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
      return { ok: true, result, attempts };
    }
    if (!result.ok && result.data && typeof result.data === 'object' && !isHtmlLike(result.raw)) {
      lastErrorAttempt = result;
    }
  }

  return {
    ok: false,
    attempts,
    result: lastErrorAttempt || attempts[attempts.length - 1] || null,
    error: '任务查询失败',
  };
}

async function pollTask(apiKey, id, intervalMs, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const probe = await probeTaskQuery(apiKey, id, Math.min(intervalMs, 30000));
    const response = probe.result?.data;
    if (response && typeof response === 'object') {
      const status = extractTaskStatus(response);
      if (TERMINAL_STATUSES.has(status)) {
        return { done: true, response, attempts: probe.attempts };
      }
      if (status) {
        return { done: false, response, attempts: probe.attempts };
      }
    }
    await sleep(intervalMs);
  }

  return { done: false, timeout: true };
}

async function listModels(apiKey) {
  return apiCall(apiKey, `${DRAW_BASE}/v1/models`, 'GET', undefined, 30000);
}

function normalizeTaskPayload(input) {
  const prompt = extractPromptText(input);
  if (!prompt) {
    throw new Error('缺少 prompt');
  }

  const payload = {
    model: input.model || DEFAULT_MODEL,
    prompt,
  };

  const duration = parseInteger(input.duration);
  if (duration !== undefined) {
    payload.duration = duration;
  }

  const metadata = (input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata))
    ? JSON.parse(JSON.stringify(input.metadata))
    : {};
  const parameters = metadata.parameters && typeof metadata.parameters === 'object' && !Array.isArray(metadata.parameters)
    ? { ...metadata.parameters }
    : {};

  const resolution = (input.resolution || parameters.resolution || '').toString().trim();
  if (resolution) {
    parameters.resolution = resolution;
  }

  const promptExtendSource = input.prompt_extend !== undefined
    ? input.prompt_extend
    : input.promptExtend !== undefined
      ? input.promptExtend
      : parameters.prompt_extend;
  parameters.prompt_extend = parseBoolean(promptExtendSource, true);

  metadata.parameters = parameters;
  payload.metadata = metadata;

  return payload;
}

function renderTaskSummary(task) {
  if (!task || typeof task !== 'object') return '';
  const lines = [];
  const id = extractTaskId(task);
  const status = extractTaskStatus(task);
  const videoUrl = extractVideoUrl(task);
  const lastFrameUrl = task.last_frame_url || task.output?.last_frame_url || task.output?.lastFrameUrl;
  if (id) lines.push(`task_id: ${id}`);
  if (status) lines.push(`task_status: ${status}`);
  if (task.model) lines.push(`model: ${task.model}`);
  if (videoUrl) lines.push(`video_url: ${videoUrl}`);
  if (lastFrameUrl) lines.push(`last_frame_url: ${lastFrameUrl}`);
  return lines.join('\n');
}

async function runCli(argv) {
  const apiKey = argv['api-key'] || process.env.OPENAI_NEXT_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('缺少 API Key。请传入 --api-key 或设置 OPENAI_NEXT_API_KEY。');
  }

  if (argv.models) {
    const models = await listModels(apiKey);
    console.log(JSON.stringify(models.data, null, 2));
    return;
  }

  const payloadInput = {
    model: argv.model || DEFAULT_MODEL,
    prompt: argv.prompt || '',
    duration: argv.duration,
    resolution: argv.resolution,
    prompt_extend: argv['prompt-extend'],
    metadata: argv.metadata,
  };

  if (argv.metadata) {
    try {
      payloadInput.metadata = typeof argv.metadata === 'string' ? JSON.parse(argv.metadata) : argv.metadata;
    } catch (err) {
      throw new Error(`--metadata 不是合法 JSON：${err.message}`);
    }
  }

  const payload = normalizeTaskPayload(payloadInput);
  const createResponse = await createTask(apiKey, payload);
  console.log(JSON.stringify(createResponse.data, null, 2));

  if (!argv.poll) return;

  const taskId = extractTaskId(createResponse.data);
  if (!taskId) {
    throw new Error('创建任务返回里没有 task id。');
  }

  const timeoutMs = parseInteger(argv.timeout, 30 * 60 * 1000);
  const intervalMs = parseInteger(argv.interval, 5000);
  const pollResult = await pollTask(apiKey, taskId, intervalMs, timeoutMs);

  if (pollResult.response) {
    console.log(renderTaskSummary(pollResult.response));
    console.log(JSON.stringify(pollResult.response, null, 2));
    return;
  }

  console.log(JSON.stringify(pollResult, null, 2));
}

function serveHtml(res) {
  const html = fs.readFileSync(HTML_FILE, 'utf8');
  sendText(res, 200, html, 'text/html; charset=utf-8');
}

async function handleApiRoute(req, res, url) {
  try {
    if (req.method === 'OPTIONS') {
      sendText(res, 204, '');
      return;
    }

    if (url.pathname === '/api/history' && req.method === 'GET') {
      sendJson(res, 200, {
        ok: true,
        data: readHistory(),
      });
      return;
    }

    if (url.pathname === '/api/history' && req.method === 'DELETE') {
      sendJson(res, 200, {
        ok: true,
        data: clearHistory(),
      });
      return;
    }

    if (req.url === '/api/models' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const apiKey = body.apiKey || body.api_key;
      if (!apiKey) {
        sendJson(res, 400, { ok: false, error: '缺少 apiKey' });
        return;
      }
      const response = await listModels(apiKey);
      sendJson(res, response.status, {
        ok: response.ok,
        status: response.status,
        upstreamUrl: response.url,
        data: response.data,
        raw: response.raw,
        error: response.ok ? null : summarizeApiError(response),
      });
      return;
    }

    if (req.url === '/api/generate' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const apiKey = body.apiKey || body.api_key;
      if (!apiKey) {
        sendJson(res, 400, { ok: false, error: '缺少 apiKey' });
        return;
      }
      let payload;
      try {
        payload = normalizeTaskPayload(body);
      } catch (err) {
        sendJson(res, 400, { ok: false, error: err.message });
        return;
      }
      const response = await createTask(apiKey, payload);
      sendJson(res, response.status, {
        ok: response.ok,
        status: response.status,
        upstreamUrl: response.url,
        payload,
        data: response.data,
        raw: response.raw,
        error: response.ok ? null : summarizeApiError(response, payload),
      });
      return;
    }

    if (req.url.startsWith('/api/task') && req.method === 'POST') {
      const body = await readJsonBody(req);
      const apiKey = body.apiKey || body.api_key;
      const id = body.id || body.task_id || new URL(req.url, 'http://localhost').searchParams.get('id');
      if (!apiKey || !id) {
        sendJson(res, 400, { ok: false, error: '缺少 apiKey 或任务 ID' });
        return;
      }
      const response = await probeTaskQuery(apiKey, id, 30000);
      const preferred = response.result || response.attempts?.[response.attempts.length - 1] || null;
      const historyEntry = response.ok && preferred?.data && typeof preferred.data === 'object'
        ? saveCompletedTaskToHistory(preferred.data)
        : null;
      sendJson(res, preferred ? preferred.status || 200 : 200, {
        ok: response.ok,
        status: preferred ? preferred.status : 0,
        upstreamUrl: preferred ? preferred.url : '',
        id,
        data: preferred ? preferred.data : null,
        history: historyEntry,
        attempts: response.attempts,
        raw: preferred ? preferred.raw : '',
        error: response.ok ? null : summarizeApiError(preferred) || response.error,
      });
      return;
    }

    sendJson(res, 404, { ok: false, error: '未找到' });
  } catch (err) {
    sendJson(res, 500, { ok: false, error: err.message });
  }
}

function startServer(port) {
  const server = http.createServer((req, res) => {
    if (!req.url) {
      sendJson(res, 400, { ok: false, error: '无效请求' });
      return;
    }

    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/models' || url.pathname === '/api/generate' || url.pathname === '/api/task' || url.pathname === '/api/history') {
      handleApiRoute(req, res, url);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/favicon.ico') {
      sendText(res, 204, '');
      return;
    }

    if (req.method === 'GET' && url.pathname === '/') {
      serveHtml(res);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 404, { ok: false, error: '未找到' });
  });

  server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      console.log(`端口 ${port} 被占用，改试 ${nextPort}...`);
      startServer(nextPort);
      return;
    }
    throw err;
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`Seedance 调试服务已启动：http://127.0.0.1:${port}`);
  });
}

async function main() {
  const argv = parseArgs(process.argv.slice(2));
  if (argv.help) {
    printHelp();
    return;
  }
  if (argv.serve) {
    startServer(DEFAULT_PORT);
    return;
  }
  await runCli(argv);
}

main().catch(err => {
  console.error(err.stack || err.message || String(err));
  process.exitCode = 1;
});
