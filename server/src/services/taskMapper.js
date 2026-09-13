function decodeJson(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function isoTime(value) {
  if (value === undefined || value === null || value === '') return '';
  const numberValue = Number(value);
  const date = Number.isFinite(numberValue)
    ? new Date(numberValue > 1_000_000_000_000 ? numberValue : numberValue * 1000)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function extractTaskId(data) {
  return String(
    data?.id
    || data?.task_id
    || data?.taskId
    || data?.output?.task_id
    || data?.output?.taskId
    || '',
  ).trim();
}

export function extractTaskStatus(data) {
  return String(
    data?.status
    || data?.task_status
    || data?.result?.data?.status
    || data?.output?.task_status
    || data?.output?.status
    || '',
  ).trim().toLowerCase();
}

export function extractVideoUrl(data) {
  return String(
    data?.result_url
    || data?.video_url
    || data?.result?.data?.content?.video_url
    || data?.output?.video_url
    || data?.output?.videoUrl
    || data?.output?.url
    || '',
  ).trim();
}

export function extractLastFrameUrl(data) {
  return String(
    data?.last_frame_url
    || data?.result?.data?.content?.last_frame_url
    || data?.output?.last_frame_url
    || data?.output?.lastFrameUrl
    || '',
  ).trim();
}

export function taskToRecord(task, requestPayload = {}) {
  const resultData = task?.result?.data || {};
  const properties = task?.properties || {};
  const input = decodeJson(properties.input) || decodeJson(properties.submit) || requestPayload || {};
  const ratios = properties.ratios || {};

  return {
    id: extractTaskId(task),
    platformTaskId: String(resultData.task_id || resultData.output?.task_id || '').trim(),
    status: extractTaskStatus(task) || 'queued',
    model: String(input.model || requestPayload.model || properties.model || resultData.model || task?.model || '').trim(),
    prompt: String(input.prompt || requestPayload.prompt || resultData.prompt || '').trim(),
    duration: input.duration ?? resultData.duration ?? ratios.duration ?? '',
    resolution: String(input.metadata?.parameters?.resolution || resultData.resolution || ratios.resolution || '').trim(),
    videoUrl: extractVideoUrl(task),
    lastFrameUrl: extractLastFrameUrl(task),
    requestPayload,
    upstreamResponse: task,
    createdAt: isoTime(task?.created ?? task?.submit_time ?? resultData.created_at),
    finishedAt: isoTime(task?.finish_time ?? resultData.updated_at),
  };
}

export function taskToClient(task) {
  return {
    id: extractTaskId(task),
    status: extractTaskStatus(task),
    progress: task?.progress || '',
    model: task?.model || task?.properties?.model || task?.result?.data?.model || '',
    prompt: task?.properties?.input ? decodeJson(task.properties.input)?.prompt || '' : '',
    videoUrl: extractVideoUrl(task),
    lastFrameUrl: extractLastFrameUrl(task),
    resultUrl: task?.result_url || '',
  };
}
