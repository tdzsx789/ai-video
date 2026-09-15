import crypto from 'node:crypto';
import { promisify } from 'node:util';

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const scrypt = promisify(crypto.scrypt);

export function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH, {
    cost: COST,
    blockSize: BLOCK_SIZE,
    parallelization: PARALLELIZATION,
  });
  return `scrypt$${COST}$${BLOCK_SIZE}$${PARALLELIZATION}$${salt.toString('base64url')}$${derivedKey.toString('base64url')}`;
}

export function verifyPassword(password, storedHash) {
  const [algorithm, cost, blockSize, parallelization, saltText, hashText] = String(storedHash || '').split('$');
  if (algorithm !== 'scrypt' || !saltText || !hashText) return false;

  try {
    const salt = Buffer.from(saltText, 'base64url');
    const expected = Buffer.from(hashText, 'base64url');
    const actual = crypto.scryptSync(password, salt, expected.length, {
      cost: Number(cost),
      blockSize: Number(blockSize),
      parallelization: Number(parallelization),
    });
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function verifyPasswordAsync(password, storedHash) {
  const [algorithm, cost, blockSize, parallelization, saltText, hashText] = String(storedHash || '').split('$');
  if (algorithm !== 'scrypt' || !saltText || !hashText) return false;

  try {
    const salt = Buffer.from(saltText, 'base64url');
    const expected = Buffer.from(hashText, 'base64url');
    const actual = await scrypt(String(password || ''), salt, expected.length, {
      cost: Number(cost),
      blockSize: Number(blockSize),
      parallelization: Number(parallelization),
      maxmem: Math.max(32 * 1024 * 1024, Number(cost) * Number(blockSize) * 128 + 1024),
    });
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}
