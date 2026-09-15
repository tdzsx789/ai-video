async function parseResponse(response) {
  const text = await response.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Keep non-JSON responses readable in the UI.
  }

  if (!response.ok || data?.ok === false) {
    const message = data?.error?.message || data?.error || `请求失败（HTTP ${response.status}）`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  return parseResponse(response);
}

export function getCurrentUser() {
  return request('/api/auth/me');
}

export function login(username, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function logout() {
  return request('/api/auth/logout', { method: 'POST' });
}

export function updateProfile(profile) {
  return request('/api/account/profile', {
    method: 'PATCH',
    body: JSON.stringify(profile),
  });
}

export function getCredits() {
  return request('/api/account/credits');
}

export function recharge(planId, idempotencyKey) {
  return request('/api/account/recharge', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ planId }),
  });
}

export function getHistory() {
  return request('/api/history');
}

export function deleteHistory() {
  return request('/api/history', { method: 'DELETE' });
}

export function createVideoTask(payload, apiKey, idempotencyKey) {
  return request('/api/generate', {
    method: 'POST',
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    body: JSON.stringify({ ...payload, apiKey }),
  });
}

export function createImage(payload, apiKey, idempotencyKey) {
  return request('/api/images/generate', {
    method: 'POST',
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    body: JSON.stringify({ ...payload, apiKey }),
  });
}

export function queryVideoTask(taskId, apiKey) {
  return request(`/api/tasks/${encodeURIComponent(taskId)}/query`, {
    method: 'POST',
    body: JSON.stringify({ apiKey }),
  });
}

export function getHealth() {
  return request('/api/health');
}
