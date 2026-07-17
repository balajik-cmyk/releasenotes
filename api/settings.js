import { sendJson, sendError, methodNotAllowed, readJsonBody } from './_lib/http.js';
import { hasGoogleCredentials, getDefaultSheetId, TABS } from './_lib/config.js';
import { requireAdmin } from './_lib/auth.js';
import { readTab, writeTab, clearActiveSheetCache, getSpreadsheetMeta } from './_lib/sheets.js';

function extractSheetId(input) {
  const s = String(input || '').trim();
  const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  // Bare ID
  if (/^[a-zA-Z0-9-_]{20,}$/.test(s)) return s;
  return '';
}

// The active-sheet override is stored in the env (default) sheet so we always
// know where to look, regardless of which sheet is currently active.
export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (!hasGoogleCredentials()) {
    return sendError(res, 500, 'Google credentials are not configured on the server.');
  }
  const envSheetId = getDefaultSheetId();

  try {
    if (req.method === 'GET') {
      const rows = await readTab(envSheetId, TABS.settings).catch(() => []);
      const row = rows.find((r) => r.key === 'active_sheet_id');
      const activeSheetId = row && row.value ? String(row.value).trim() : envSheetId;
      return sendJson(res, 200, { activeSheetId, defaultSheetId: envSheetId });
    }

    if (req.method === 'PUT') {
      const body = await readJsonBody(req);
      const id = extractSheetId(body.sheetUrl || body.sheetId || '');
      if (!id) return sendError(res, 400, 'Provide a valid Google Sheet URL or ID.');
      // Verify we can reach it before saving.
      try {
        await getSpreadsheetMeta(id);
      } catch (err) {
        return sendError(res, 400, 'Cannot access that sheet. Share it with the service account.', {
          detail: String(err.message || err),
        });
      }
      await writeTab(envSheetId, TABS.settings, [{ key: 'active_sheet_id', value: id }]);
      clearActiveSheetCache();
      return sendJson(res, 200, { ok: true, activeSheetId: id });
    }

    return methodNotAllowed(res, ['GET', 'PUT']);
  } catch (err) {
    return sendError(res, 502, 'Settings write failed.', { detail: String(err.message || err) });
  }
}
