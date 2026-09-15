export async function readResponseText(response, maxBytes = 2 * 1024 * 1024) {
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > maxBytes) {
    const error = new Error('上游响应过大，已停止读取。');
    error.code = 'UPSTREAM_RESPONSE_TOO_LARGE';
    error.status = 502;
    throw error;
  }

  if (!response.body?.getReader) {
    const raw = await response.text();
    if (Buffer.byteLength(raw, 'utf8') > maxBytes) {
      const error = new Error('上游响应过大，已停止读取。');
      error.code = 'UPSTREAM_RESPONSE_TOO_LARGE';
      error.status = 502;
      throw error;
    }
    return raw;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        const error = new Error('上游响应过大，已停止读取。');
        error.code = 'UPSTREAM_RESPONSE_TOO_LARGE';
        error.status = 502;
        throw error;
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total).toString('utf8');
}
