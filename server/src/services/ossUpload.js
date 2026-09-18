import crypto from 'node:crypto';
import https from 'node:https';
import { Transform } from 'node:stream';
import { config } from '../config/env.js';
import { httpError } from '../utils/httpError.js';

const ASSET_TYPES = {
  image: {
    prefixes: ['image/'],
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'],
  },
  video: {
    prefixes: ['video/'],
    extensions: ['mp4', 'mov', 'webm', 'm4v'],
  },
  audio: {
    prefixes: ['audio/'],
    extensions: ['mp3', 'wav', 'm4a', 'aac', 'ogg'],
  },
};

function ensureOssConfigured() {
  const missing = [
    ['OSS_ACCESS_KEY_ID', config.oss.accessKeyId],
    ['OSS_ACCESS_KEY_SECRET', config.oss.accessKeySecret],
    ['OSS_BUCKET', config.oss.bucket],
    ['OSS_ENDPOINT', config.oss.endpoint],
  ].filter(([, value]) => !value);

  if (missing.length) {
    throw httpError(503, `OSS 上传暂未配置，缺少 ${missing.map(([key]) => key).join('、')}。`, {
      code: 'OSS_NOT_CONFIGURED',
    });
  }
}

function safeAssetType(value) {
  const type = String(value || '').trim().toLowerCase();
  if (!ASSET_TYPES[type]) {
    throw httpError(400, '不支持的素材类型。', { code: 'UNSUPPORTED_ASSET_TYPE' });
  }
  return type;
}

function extensionFromFilename(filename) {
  const clean = String(filename || '').split(/[\\/]/).pop() || 'asset';
  const match = clean.toLowerCase().match(/\.([a-z0-9]{1,12})$/);
  return match ? match[1] : '';
}

function assertFileMeta({ filename, contentType, size, assetType }) {
  const typeConfig = ASSET_TYPES[assetType];
  const normalizedContentType = String(contentType || '').trim().toLowerCase();
  const extension = extensionFromFilename(filename);
  const validContentType = typeConfig.prefixes.some(prefix => normalizedContentType.startsWith(prefix));
  const validExtension = extension && typeConfig.extensions.includes(extension);
  const numericSize = Number(size);

  if (!validContentType && !validExtension) {
    throw httpError(400, '文件类型与素材类型不匹配。', { code: 'INVALID_UPLOAD_TYPE' });
  }
  if (!Number.isFinite(numericSize) || numericSize <= 0) {
    throw httpError(400, '请上传有效文件。', { code: 'INVALID_UPLOAD_SIZE' });
  }
  if (numericSize > config.oss.maxFileSizeBytes) {
    throw httpError(413, `文件不能超过 ${Math.round(config.oss.maxFileSizeBytes / 1024 / 1024)}MB。`, {
      code: 'UPLOAD_TOO_LARGE',
    });
  }
}

function uploadPrefixForAssetType(assetType) {
  return assetType === 'image'
    ? config.oss.imageUploadPrefix
    : config.oss.videoUploadPrefix;
}

function buildObjectKey({ userId, filename, assetType }) {
  const extension = extensionFromFilename(filename);
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const suffix = extension ? `.${extension}` : '';
  const prefix = [
    uploadPrefixForAssetType(assetType),
    `user-${userId}`,
    assetType,
    yyyy,
    mm,
    dd,
  ].filter(Boolean).join('/');
  return `${prefix}/${crypto.randomUUID()}${suffix}`;
}

function userUploadPrefix(userId, assetType) {
  return [
    uploadPrefixForAssetType(assetType),
    `user-${userId}`,
    assetType,
  ].filter(Boolean).join('/');
}

function uploadHost() {
  return `https://${config.oss.bucket}.${config.oss.endpoint}`;
}

function objectUrlForKey(key) {
  const encodedKey = key.split('/').map(part => encodeURIComponent(part)).join('/');
  return `${uploadHost()}/${encodedKey}`;
}

function signedUrlForKey(key) {
  const expires = Math.floor(Date.now() / 1000) + config.oss.signedUrlExpireSeconds;
  const canonicalizedHeaders = canonicalizedOssHeaders();
  const canonicalizedResource = `/${config.oss.bucket}/${key}`;
  const stringToSign = [
    'GET',
    '',
    '',
    String(expires),
    `${canonicalizedHeaders}${canonicalizedResource}`,
  ].join('\n');
  const signature = crypto
    .createHmac('sha1', config.oss.accessKeySecret)
    .update(stringToSign)
    .digest('base64');
  const url = new URL(objectUrlForKey(key));
  url.searchParams.set('OSSAccessKeyId', config.oss.accessKeyId);
  url.searchParams.set('Expires', String(expires));
  url.searchParams.set('Signature', signature);
  if (config.oss.securityToken) {
    url.searchParams.set('x-oss-security-token', config.oss.securityToken);
  }
  return url.toString();
}

function fileUrlForKey(key) {
  if (config.oss.publicBaseUrl) {
    const encodedKey = key.split('/').map(part => encodeURIComponent(part)).join('/');
    return `${config.oss.publicBaseUrl}/${encodedKey}`;
  }
  return signedUrlForKey(key);
}

function canonicalizedOssHeaders() {
  if (!config.oss.securityToken) return '';
  return `x-oss-security-token:${config.oss.securityToken}\n`;
}

function createSizeGuard(stream, expectedSize) {
  const declaredSize = Number(expectedSize);
  const maxBytes = Math.min(config.oss.maxFileSizeBytes, declaredSize);
  let receivedBytes = 0;

  const guard = new Transform({
    transform(chunk, _encoding, callback) {
      receivedBytes += chunk.length;
      if (receivedBytes > maxBytes) {
        callback(httpError(413, `文件不能超过 ${Math.round(config.oss.maxFileSizeBytes / 1024 / 1024)}MB。`, {
          code: 'UPLOAD_TOO_LARGE',
        }));
        return;
      }
      callback(null, chunk);
    },
    flush(callback) {
      if (receivedBytes !== declaredSize) {
        callback(httpError(400, '上传文件大小校验失败，请重试。', {
          code: 'UPLOAD_SIZE_MISMATCH',
        }));
        return;
      }
      callback();
    },
  });

  stream.on('aborted', () => {
    guard.destroy(httpError(400, '上传连接已中断，请重试。', {
      code: 'UPLOAD_ABORTED',
    }));
  });
  stream.on('error', error => guard.destroy(error));
  return guard;
}

function putObjectStream({ key, contentType, size, stream }) {
  const targetUrl = new URL(objectUrlForKey(key));
  const date = new Date().toUTCString();
  const canonicalizedHeaders = canonicalizedOssHeaders();
  const canonicalizedResource = `/${config.oss.bucket}/${key}`;
  const stringToSign = [
    'PUT',
    '',
    contentType,
    date,
    `${canonicalizedHeaders}${canonicalizedResource}`,
  ].join('\n');
  const signature = crypto
    .createHmac('sha1', config.oss.accessKeySecret)
    .update(stringToSign)
    .digest('base64');
  const headers = {
    Date: date,
    'Content-Type': contentType,
    'Content-Length': String(size),
    Authorization: `OSS ${config.oss.accessKeyId}:${signature}`,
  };
  if (config.oss.securityToken) headers['x-oss-security-token'] = config.oss.securityToken;

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      callback(value);
    };

    const request = https.request({
      protocol: targetUrl.protocol,
      hostname: targetUrl.hostname,
      port: targetUrl.port || 443,
      method: 'PUT',
      path: targetUrl.pathname,
      headers,
    });

    request.on('error', error => finish(reject, error));
    request.on('response', response => {
      let responseBody = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {
        responseBody += chunk;
      });
      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          finish(resolve, {
            url: fileUrlForKey(key),
            key,
          });
          return;
        }
        finish(reject, httpError(502, 'OSS 文件上传失败，请稍后重试。', {
          code: 'OSS_UPLOAD_FAILED',
          providerStatus: response.statusCode,
          providerMessage: responseBody.slice(0, 500),
        }));
      });
    });

    const guardedStream = createSizeGuard(stream, size);
    guardedStream.on('error', error => {
      request.destroy();
      finish(reject, error);
    });
    stream.pipe(guardedStream).pipe(request);
  });
}

export function createOssUploadPolicy({ userId, filename, contentType, size, assetType }) {
  ensureOssConfigured();
  const normalizedAssetType = safeAssetType(assetType);
  assertFileMeta({ filename, contentType, size, assetType: normalizedAssetType });

  const key = buildObjectKey({ userId, filename, assetType: normalizedAssetType });
  const expiresAt = new Date(Date.now() + config.oss.policyExpireSeconds * 1000).toISOString();
  const normalizedContentType = String(contentType || '').trim().toLowerCase();
  const policy = {
    expiration: expiresAt,
    conditions: [
      ['content-length-range', 1, config.oss.maxFileSizeBytes],
      ['starts-with', '$key', `${userUploadPrefix(userId, normalizedAssetType)}/`],
      { bucket: config.oss.bucket },
      { key },
      { success_action_status: '201' },
      ...(normalizedContentType ? [['starts-with', '$Content-Type', normalizedContentType]] : []),
      ...(config.oss.securityToken ? [{ 'x-oss-security-token': config.oss.securityToken }] : []),
    ],
  };
  const encodedPolicy = Buffer.from(JSON.stringify(policy)).toString('base64');
  const signature = crypto
    .createHmac('sha1', config.oss.accessKeySecret)
    .update(encodedPolicy)
    .digest('base64');
  const fields = {
    key,
    policy: encodedPolicy,
    OSSAccessKeyId: config.oss.accessKeyId,
    Signature: signature,
    success_action_status: '201',
    ...(normalizedContentType ? { 'Content-Type': normalizedContentType } : {}),
  };

  if (config.oss.securityToken) fields['x-oss-security-token'] = config.oss.securityToken;

  return {
    url: uploadHost(),
    fileUrl: fileUrlForKey(key),
    fields,
    expiresAt,
    maxFileSize: config.oss.maxFileSizeBytes,
  };
}

export async function uploadOssStream({ userId, filename, contentType, size, assetType, stream }) {
  ensureOssConfigured();
  const normalizedAssetType = safeAssetType(assetType);
  const normalizedContentType = String(contentType || '').trim().toLowerCase() || 'application/octet-stream';
  assertFileMeta({
    filename,
    contentType: normalizedContentType,
    size,
    assetType: normalizedAssetType,
  });

  const key = buildObjectKey({ userId, filename, assetType: normalizedAssetType });
  return putObjectStream({
    key,
    contentType: normalizedContentType,
    size: Number(size),
    stream,
  });
}
