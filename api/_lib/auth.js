import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { sendError } from './http.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getPasscodeHash() {
  return String(process.env.ADMIN_PASSCODE_HASH || '').trim();
}

function getSessionSecret() {
  return String(process.env.ADMIN_SESSION_SECRET || '').trim();
}

export function isAuthConfigured() {
  return Boolean(getPasscodeHash() && getSessionSecret());
}

function parsePackedHash(packed) {
  const parts = String(packed || '').split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    throw new Error('ADMIN_PASSCODE_HASH is invalid. Use scripts/hash-passcode.js to generate one.');
  }
  return {
    salt: Buffer.from(parts[1], 'base64url'),
    hash: Buffer.from(parts[2], 'base64url'),
  };
}

export function hashPasscode(passcode, salt = randomBytes(16)) {
  const hash = scryptSync(String(passcode || ''), salt, 64);
  return {
    packed: `scrypt:${salt.toString('base64url')}:${hash.toString('base64url')}`,
    salt,
    hash,
  };
}

export function verifyPasscode(passcode) {
  const packed = getPasscodeHash();
  if (!packed) return false;
  try {
    const { salt, hash } = parsePackedHash(packed);
    const attempt = scryptSync(String(passcode || ''), salt, 64);
    if (attempt.length !== hash.length) return false;
    return timingSafeEqual(attempt, hash);
  } catch {
    return false;
  }
}

function sign(value) {
  return createHmac('sha256', getSessionSecret()).update(value).digest('base64url');
}

export function createSessionToken() {
  if (!getSessionSecret()) throw new Error('ADMIN_SESSION_SECRET is not configured.');
  const now = Date.now();
  const payload = Buffer.from(
    JSON.stringify({ iat: now, exp: now + SESSION_TTL_MS }),
    'utf8'
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token) {
  if (!token || !getSessionSecret()) return false;
  const [payload, sig] = String(token).split('.');
  if (!payload || !sig) return false;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number(data.exp) > Date.now();
  } catch {
    return false;
  }
}

export function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  if (match) return match[1].trim();
  const custom = req.headers['x-admin-token'] || req.headers['X-Admin-Token'];
  return custom ? String(custom).trim() : '';
}

/** Returns true if authorized; otherwise writes 401/503 and returns false. */
export function requireAdmin(req, res) {
  if (!isAuthConfigured()) {
    sendError(res, 503, 'Admin auth is not configured on the server.', {
      hint: 'Set ADMIN_PASSCODE_HASH and ADMIN_SESSION_SECRET, then redeploy.',
    });
    return false;
  }
  const token = getBearerToken(req);
  if (!verifySessionToken(token)) {
    sendError(res, 401, 'Admin unlock required.', { code: 'ADMIN_AUTH_REQUIRED' });
    return false;
  }
  return true;
}
