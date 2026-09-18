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

export function updatePassword(currentPassword, newPassword) {
  return request('/api/account/password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function verifyCurrentPassword(currentPassword) {
  return request('/api/account/password/verify', {
    method: 'POST',
    body: JSON.stringify({ currentPassword }),
  });
}

export function getCredits() {
  return request('/api/account/credits');
}

export function getCreditRecords(limit = 20) {
  return request(`/api/account/credit-records?limit=${encodeURIComponent(limit)}`);
}

export function recharge(planId, idempotencyKey, paymentMethod = 'wechat', amount) {
  return request('/api/account/recharge', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ planId, paymentMethod, amount }),
  });
}

export function getHistory() {
  return request('/api/history');
}

export function deleteHistory() {
  return request('/api/history', { method: 'DELETE' });
}

export function createVideoTask(payload, idempotencyKey) {
  return request('/api/generate', {
    method: 'POST',
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    body: JSON.stringify(payload),
  });
}

export function createImage(payload, idempotencyKey) {
  return request('/api/images/generate', {
    method: 'POST',
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    body: JSON.stringify(payload),
  });
}

export function queryVideoTask(taskId) {
  return request(`/api/tasks/${encodeURIComponent(taskId)}/query`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function createOssUploadPolicy({ filename, contentType, size, assetType }) {
  return request('/api/uploads/oss-policy', {
    method: 'POST',
    body: JSON.stringify({ filename, contentType, size, assetType }),
  });
}

export async function uploadFileToOss(file, assetType) {
  const uploadResponse = await fetch('/api/uploads/oss', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'X-Upload-Asset-Type': assetType,
      'X-Upload-Filename': encodeURIComponent(file.name),
      'X-Upload-Size': String(file.size),
    },
    body: file,
  });
  const response = await parseResponse(uploadResponse);
  const upload = response.upload;

  if (!upload?.url) {
    throw new Error('OSS 上传成功，但没有返回素材地址。');
  }

  return {
    url: upload.fileUrl || upload.url,
    name: file.name,
    size: file.size,
    type: file.type,
  };
}
