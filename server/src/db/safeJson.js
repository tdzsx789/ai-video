const SENSITIVE_KEY = /(password|passwd|secret|token|api[_-]?key|authorization|cookie)/i;
const MAX_STRING_LENGTH = 20_000;
const MAX_ARRAY_LENGTH = 100;
const MAX_OBJECT_KEYS = 100;
const MAX_DEPTH = 6;

function sanitize(value, depth = 0) {
  if (depth > MAX_DEPTH) return '[truncated]';
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}…[truncated]`
      : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_LENGTH)
      .map(item => sanitize(item, depth + 1));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, MAX_OBJECT_KEYS)
        .filter(([key]) => !SENSITIVE_KEY.test(key))
        .map(([key, item]) => [key, sanitize(item, depth + 1)]),
    );
  }

  return String(value);
}

export function safeJson(value, maxBytes = 256 * 1024) {
  const sanitized = sanitize(value);
  const serialized = JSON.stringify(sanitized) ?? 'null';
  if (Buffer.byteLength(serialized, 'utf8') <= maxBytes) return sanitized;

  return {
    truncated: true,
    preview: serialized.slice(0, Math.max(0, maxBytes - 64)),
  };
}

export function safeError(error) {
  return safeJson({
    name: error?.name || 'Error',
    message: error?.message || 'Unknown error',
    code: error?.code || '',
  }, 8 * 1024);
}

export function safeExternalText(value, maxLength = 800) {
  return String(value || '')
    .replace(/(authorization\s*[:=]\s*bearer\s+|bearer\s+|api[_-]?key\s*[:=]\s*|token\s*[:=]\s+)[^\s,;"']+/gi, '$1[redacted]')
    .slice(0, maxLength);
}
