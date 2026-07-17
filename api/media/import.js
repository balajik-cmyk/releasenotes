import { sendJson, sendError, methodNotAllowed, readJsonBody } from '../_lib/http.js';
import { hasBlobToken } from '../_lib/config.js';
import { requireAdmin } from '../_lib/auth.js';
import { importFromUrl } from '../_lib/media.js';

// Import a public / Google Drive URL: the server downloads it and copies it to
// Vercel Blob so the published page uses a stable URL.
export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!requireAdmin(req, res)) return;
  if (!hasBlobToken()) {
    return sendError(res, 500, 'BLOB_READ_WRITE_TOKEN is not configured on the server.');
  }
  try {
    const body = await readJsonBody(req);
    const result = await importFromUrl(body.url);
    return sendJson(res, 201, result);
  } catch (err) {
    return sendError(res, 400, 'Import failed.', { detail: String(err.message || err) });
  }
}
