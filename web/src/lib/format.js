export const TERMINAL_STATUSES = new Set([
  'completed',
  'succeeded',
  'failed',
  'cancelled',
  'canceled',
  'expired',
]);

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
  const normalized = String(status || '').toLowerCase();
  return STATUS_LABELS[normalized] || normalized || '等待任务';
}

export function statusTone(status) {
  const normalized = String(status || '').toLowerCase();
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
  return String(task?.status || task?.task_status || task?.result?.data?.status || '').toLowerCase();
}

export function getVideoUrl(task) {
  return task?.result_url
    || task?.video_url
    || task?.result?.data?.content?.video_url
    || task?.output?.video_url
    || task?.output?.videoUrl
    || task?.output?.url
    || '';
}
