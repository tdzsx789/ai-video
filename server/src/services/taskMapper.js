function decodeJson(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

const TERMINAL_STATUSES = new Set([
  'completed',
  'succeeded',
  'failed',
  'cancelled',
  'canceled',
  'expired',
]);

const SUCCESS_STATUSES = new Set(['completed', 'succeeded']);
const FAILED_STATUSES = new Set(['failed', 'cancelled', 'canceled', 'expired']);

const STATUS_ALIASES = new Map([
  ['complete', 'completed'],
  ['done', 'completed'],
  ['finish', 'completed'],
  ['finished', 'completed'],
  ['success', 'succeeded'],
  ['successful', 'succeeded'],
  ['error', 'failed'],
  ['failure', 'failed'],
  ['in progress', 'processing'],
  ['in-progress', 'processing'],
  ['in_progress', 'processing'],
  ['generating', 'processing'],
  ['running', 'processing'],
  ['pending', 'queued'],
  ['created', 'queued'],
  ['waiting', 'queued'],
]);

function normalizeStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return STATUS_ALIASES.get(normalized) || normalized;
}

function taskEnvelope(data) {
  return data?.task || data?.data?.task || data;
}

function statusCandidates(data) {
  return [
    data?.status,
    data?.task_status,
    data?.taskStatus,
    data?.state,
    data?.data?.status,
    data?.data?.task_status,
    data?.data?.taskStatus,
    data?.data?.state,
    data?.result?.status,
    data?.result?.task_status,
    data?.result?.state,
    data?.result?.data?.status,
    data?.result?.data?.task_status,
    data?.result?.data?.state,
    data?.output?.task_status,
    data?.output?.status,
    data?.output?.state,
    data?.task?.status,
    data?.task?.task_status,
    data?.task?.state,
    data?.data?.task?.status,
    data?.data?.task?.task_status,
    data?.data?.task?.state,
  ]
    .map(normalizeStatus)
    .filter(Boolean);
}

function isoTime(value) {
  if (value === undefined || value === null || value === '' || value === 0 || value === '0') return '';
  const numberValue = Number(value);
  const date = Number.isFinite(numberValue)
    ? new Date(numberValue > 1_000_000_000_000 ? numberValue : numberValue * 1000)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function extractTaskId(data) {
  const task = taskEnvelope(data);
  return String(
    data?.id
    || data?.task_id
    || data?.taskId
    || data?.result?.data?.id
    || data?.result?.data?.task_id
    || data?.output?.task_id
    || data?.output?.taskId
    || task?.id
    || task?.task_id
    || '',
  ).trim();
}

export function extractTaskStatus(data) {
  const candidates = statusCandidates(data);
  return candidates.find(status => TERMINAL_STATUSES.has(status)) || candidates[0] || '';
}

export function isTerminalTaskStatus(status) {
  return TERMINAL_STATUSES.has(normalizeStatus(status));
}

export function isSuccessfulTaskStatus(status) {
  return SUCCESS_STATUSES.has(normalizeStatus(status));
}

export function isFailedTaskStatus(status) {
  return FAILED_STATUSES.has(normalizeStatus(status));
}

export function extractTaskProgress(data) {
  const task = taskEnvelope(data);
  return String(
    data?.progress
    || data?.result?.data?.progress
    || data?.output?.progress
    || task?.progress
    || '',
  );
}

export function extractVideoUrl(data) {
  const task = taskEnvelope(data);
  return String(
    data?.result_url
    || data?.video_url
    || data?.result?.data?.video_url
    || data?.result?.data?.url
    || data?.data?.result_url
    || data?.data?.video_url
    || data?.data?.videoUrl
    || data?.data?.url
    || data?.result?.video_url
    || data?.result?.videoUrl
    || data?.result?.url
    || data?.result?.data?.content?.video_url
    || data?.data?.content?.video_url
    || data?.data?.content?.url
    || data?.output?.video_url
    || data?.output?.videoUrl
    || data?.output?.result_url
    || data?.output?.url
    || data?.content?.url
    || data?.content?.video_url
    || task?.content?.url
    || task?.content?.video_url
    || '',
  ).trim();
}

export function extractLastFrameUrl(data) {
  const task = taskEnvelope(data);
  return String(
    data?.last_frame_url
    || data?.result?.data?.content?.last_frame_url
    || data?.data?.last_frame_url
    || data?.data?.lastFrameUrl
    || data?.result?.last_frame_url
    || data?.output?.last_frame_url
    || data?.output?.lastFrameUrl
    || task?.content?.last_frame_url
    || task?.content?.lastFrameUrl
    || '',
  ).trim();
}

export function taskToRecord(task, requestPayload = {}) {
  const taskData = taskEnvelope(task);
  const resultData = task?.result?.data || {};
  const properties = task?.properties || {};
  const input = decodeJson(properties.input) || decodeJson(properties.submit) || requestPayload || {};
  const ratios = properties.ratios || {};

  return {
    id: extractTaskId(task),
    platformTaskId: String(resultData.task_id || resultData.output?.task_id || '').trim(),
    status: extractTaskStatus(task) || 'queued',
    model: String(input.model || requestPayload.model || properties.model || resultData.model || taskData?.model || '').trim(),
    prompt: String(input.prompt || requestPayload.prompt || resultData.prompt || '').trim(),
    duration: input.duration ?? resultData.duration ?? ratios.duration ?? taskData?.duration ?? '',
    resolution: String(
      input.resolution
      || input.metadata?.parameters?.resolution
      || resultData.resolution
      || ratios.resolution
      || taskData?.resolution
      || '',
    ).trim(),
    videoUrl: extractVideoUrl(task),
    lastFrameUrl: extractLastFrameUrl(task),
    requestPayload,
    upstreamResponse: task,
    createdAt: isoTime(task?.created ?? task?.submit_time ?? resultData.created_at ?? taskData?.created_at),
    finishedAt: isoTime(task?.finish_time ?? resultData.updated_at ?? taskData?.updated_at),
  };
}

export function taskToClient(task) {
  const taskData = taskEnvelope(task);
  return {
    id: extractTaskId(task),
    status: extractTaskStatus(task),
    progress: extractTaskProgress(task),
    model: taskData?.model || task?.properties?.model || task?.result?.data?.model || '',
    prompt: task?.properties?.input ? decodeJson(task.properties.input)?.prompt || '' : '',
    videoUrl: extractVideoUrl(task),
    lastFrameUrl: extractLastFrameUrl(task),
    resultUrl: task?.result_url || taskData?.content?.url || '',
  };
}
