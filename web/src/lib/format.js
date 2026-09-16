export const TERMINAL_STATUSES = new Set([
  'completed',
  'succeeded',
  'failed',
  'cancelled',
  'canceled',
  'expired',
]);

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

function statusCandidates(task) {
  return [
    task?.status,
    task?.task_status,
    task?.taskStatus,
    task?.state,
    task?.data?.status,
    task?.data?.task_status,
    task?.data?.taskStatus,
    task?.data?.state,
    task?.result?.status,
    task?.result?.task_status,
    task?.result?.state,
    task?.result?.data?.status,
    task?.result?.data?.task_status,
    task?.result?.data?.state,
    task?.output?.status,
    task?.output?.task_status,
    task?.task?.status,
    task?.task?.task_status,
    task?.task?.state,
    task?.data?.task?.status,
    task?.data?.task?.task_status,
    task?.data?.task?.state,
  ]
    .map(normalizeStatus)
    .filter(Boolean);
}

export const STATUS_LABELS = {
  queued: '排队中',
  processing: '生成中',
  running: '生成中',
  completed: '已完成',
  succeeded: '已完成',
  failed: '失败',
  cancelled: '已取消',
  canceled: '已取消',
  expired: '已过期',
};

export function statusLabel(status) {
  const normalized = normalizeStatus(status);
  return STATUS_LABELS[normalized] || normalized || '等待任务';
}

export function statusTone(status) {
  const normalized = normalizeStatus(status);
  if (['completed', 'succeeded'].includes(normalized)) return 'success';
  if (['failed', 'cancelled', 'canceled', 'expired'].includes(normalized)) return 'danger';
  if (normalized) return 'loading';
  return 'neutral';
}

export function formatDate(value) {
  if (!value) return '时间未知';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '时间未知';
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDuration(seconds) {
  return seconds ? `${seconds} 秒` : '未设置';
}

export function getTaskStatus(task) {
  const candidates = statusCandidates(task);
  return candidates.find(status => TERMINAL_STATUSES.has(status)) || candidates[0] || '';
}

export function getVideoUrl(task) {
  return task?.result_url
    || task?.resultUrl
    || task?.videoUrl
    || task?.video_url
    || task?.data?.result_url
    || task?.data?.video_url
    || task?.data?.videoUrl
    || task?.data?.url
    || task?.result?.video_url
    || task?.result?.videoUrl
    || task?.result?.url
    || task?.result?.data?.content?.video_url
    || task?.data?.content?.video_url
    || task?.data?.content?.url
    || task?.output?.video_url
    || task?.output?.videoUrl
    || task?.output?.url
    || '';
}
