import { config } from '../config/env.js';
import { findSessionUser } from '../db/authRepository.js';
import { httpError } from '../utils/httpError.js';

function parseCookies(header = '') {
  return String(header)
    .split(';')
    .map(value => value.trim())
    .filter(Boolean)
    .reduce((cookies, pair) => {
      const separator = pair.indexOf('=');
      if (separator < 0) return cookies;
      const key = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      try {
        cookies[key] = decodeURIComponent(value);
      } catch {
        cookies[key] = value;
      }
      return cookies;
    }, {});
}

export function sessionTokenFromRequest(request) {
  const cookies = parseCookies(request.headers.cookie);
  return cookies[config.sessionCookieName] || '';
}

export async function attachOptionalUser(request, _response, next) {
  try {
    const token = sessionTokenFromRequest(request);
    request.authToken = token;
    request.user = token ? await findSessionUser(token) : null;
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireAuth(request, _response, next) {
  try {
    const token = sessionTokenFromRequest(request);
    const user = token ? await findSessionUser(token) : null;
    if (!user) throw httpError(401, '请先登录。', { code: 'AUTH_REQUIRED' });
    request.authToken = token;
    request.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function sessionCookie(token, expiresAt) {
  const parts = [
    `${config.sessionCookieName}=${encodeURIComponent(token)}`,
    'Path=/',
    `Expires=${new Date(expiresAt).toUTCString()}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (config.sessionCookieSecure) parts.push('Secure');
  return parts.join('; ');
}

export function expiredSessionCookie() {
  return [
    `${config.sessionCookieName}=`,
    'Path=/',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax',
    ...(config.sessionCookieSecure ? ['Secure'] : []),
  ].join('; ');
}
