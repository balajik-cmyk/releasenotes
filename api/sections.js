import { sendJson, sendError, methodNotAllowed, readJsonBody } from './_lib/http.js';
import { hasGoogleCredentials } from './_lib/config.js';
import {
  getRawSections,
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
} from './_lib/store.js';

export default async function handler(req, res) {
  if (!hasGoogleCredentials()) {
    return sendError(res, 500, 'Google credentials are not configured on the server.');
  }

  try {
    if (req.method === 'GET') {
      const sections = await getRawSections();
      return sendJson(res, 200, { sections });
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      // Reorder action shares this endpoint.
      if (body.action === 'reorder' && Array.isArray(body.orderedIds)) {
        await reorderSections(body.orderedIds);
        return sendJson(res, 200, { ok: true });
      }
      const result = await createSection(body);
      if (!result.ok) return sendError(res, 400, 'Validation failed', { errors: result.errors });
      return sendJson(res, 201, result);
    }

    if (req.method === 'PUT') {
      const body = await readJsonBody(req);
      const result = await updateSection(body);
      if (!result.ok) return sendError(res, 400, 'Validation failed', { errors: result.errors });
      return sendJson(res, 200, result);
    }

    if (req.method === 'DELETE') {
      const body = await readJsonBody(req).catch(() => ({}));
      const id = body.id || (req.url.split('?')[1] || '').match(/id=([^&]+)/)?.[1];
      const result = await deleteSection(decodeURIComponent(id || ''));
      if (!result.ok) return sendError(res, 404, 'Delete failed', { errors: result.errors });
      return sendJson(res, 200, result);
    }

    return methodNotAllowed(res, ['GET', 'POST', 'PUT', 'DELETE']);
  } catch (err) {
    return sendError(res, 502, 'Sheet write failed.', { detail: String(err.message || err) });
  }
}
