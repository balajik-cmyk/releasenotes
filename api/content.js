import { sendJson, sendError, methodNotAllowed } from './_lib/http.js';
import { hasGoogleCredentials } from './_lib/config.js';
import { getContent } from './_lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  if (!hasGoogleCredentials()) {
    return sendError(res, 500, 'Google credentials are not configured on the server.');
  }
  try {
    const content = await getContent();
    return sendJson(res, 200, content);
  } catch (err) {
    return sendError(res, 502, 'Failed to read content from Google Sheets.', {
      detail: String(err.message || err),
    });
  }
}
