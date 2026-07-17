import { sendJson, sendError, methodNotAllowed, readJsonBody } from '../_lib/http.js';
import {
  isAuthConfigured,
  verifyPasscode,
  createSessionToken,
  verifySessionToken,
  getBearerToken,
} from '../_lib/auth.js';

// Unlock admin with a passcode. The plaintext passcode is never stored in the
// repo — only a scrypt hash in ADMIN_PASSCODE_HASH is compared server-side.
export default async function handler(req, res) {
  if (req.method === 'GET') {
    if (!isAuthConfigured()) {
      return sendError(res, 503, 'Admin auth is not configured on the server.');
    }
    const token = getBearerToken(req);
    return sendJson(res, 200, { unlocked: verifySessionToken(token) });
  }

  if (req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);
  if (!isAuthConfigured()) {
    return sendError(res, 503, 'Admin auth is not configured on the server.', {
      hint: 'Set ADMIN_PASSCODE_HASH and ADMIN_SESSION_SECRET, then redeploy.',
    });
  }

  try {
    const body = await readJsonBody(req);
    const passcode = String(body.passcode || '').trim();
    if (!passcode) return sendError(res, 400, 'Passcode is required.');
    if (!verifyPasscode(passcode)) {
      return sendError(res, 401, 'Incorrect passcode.');
    }
    const token = createSessionToken();
    return sendJson(res, 200, { ok: true, token, expiresInDays: 7 });
  } catch (err) {
    return sendError(res, 400, 'Unlock failed.', { detail: String(err.message || err) });
  }
}
