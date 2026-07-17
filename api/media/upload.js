import { sendJson, sendError, methodNotAllowed, readRawBody } from '../_lib/http.js';
import { hasBlobToken } from '../_lib/config.js';
import { requireAdmin } from '../_lib/auth.js';
import { storeBuffer, MEDIA_LIMITS } from '../_lib/media.js';

// Raw-body upload: the client sends the file bytes as the request body with the
// Content-Type header set and the filename in ?filename=. This avoids
// multipart parsing in the serverless function.
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!requireAdmin(req, res)) return;
  if (!hasBlobToken()) {
    return sendError(res, 500, 'BLOB_READ_WRITE_TOKEN is not configured on the server.');
  }
  try {
    const url = new URL(req.url, 'http://localhost');
    const filename = url.searchParams.get('filename') || 'upload';
    const contentType = req.headers['content-type'] || '';
    const buffer = await readRawBody(req);
    if (!buffer.length) return sendError(res, 400, 'Empty upload.');
    if (buffer.length > MEDIA_LIMITS.maxBytes) {
      return sendError(res, 413, 'File too large.');
    }
    const result = await storeBuffer(buffer, { filename, contentType });
    return sendJson(res, 201, result);
  } catch (err) {
    return sendError(res, 400, 'Upload failed.', { detail: String(err.message || err) });
  }
}
