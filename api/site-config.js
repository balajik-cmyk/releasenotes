import { sendJson, sendError, methodNotAllowed, readJsonBody } from './_lib/http.js';
import { hasGoogleCredentials } from './_lib/config.js';
import { getSiteConfig, saveSiteConfig } from './_lib/store.js';

export default async function handler(req, res) {
  if (!hasGoogleCredentials()) {
    return sendError(res, 500, 'Google credentials are not configured on the server.');
  }
  try {
    if (req.method === 'GET') {
      const config = await getSiteConfig();
      return sendJson(res, 200, { config });
    }
    if (req.method === 'PUT') {
      const body = await readJsonBody(req);
      await saveSiteConfig(body.config || body);
      return sendJson(res, 200, { ok: true });
    }
    return methodNotAllowed(res, ['GET', 'PUT']);
  } catch (err) {
    return sendError(res, 502, 'Site config write failed.', { detail: String(err.message || err) });
  }
}
