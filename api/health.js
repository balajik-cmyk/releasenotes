import { sendJson, sendError, methodNotAllowed } from './_lib/http.js';
import { hasGoogleCredentials, hasBlobToken, getServiceAccountEmail } from './_lib/config.js';
import { getActiveSheetId, getSpreadsheetMeta } from './_lib/sheets.js';

// Connection/health check used by the admin "Fetch Tabs" button.
export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  if (!hasGoogleCredentials()) {
    return sendError(res, 500, 'Google credentials are not configured on the server.', {
      hasBlob: hasBlobToken(),
    });
  }
  try {
    const sheetId = await getActiveSheetId();
    const meta = await getSpreadsheetMeta(sheetId);
    return sendJson(res, 200, {
      connected: true,
      sheetId,
      serviceAccount: getServiceAccountEmail(),
      title: meta.title,
      tabs: meta.tabs,
      hasBlob: hasBlobToken(),
    });
  } catch (err) {
    return sendError(res, 502, 'Could not connect to the Google Sheet.', {
      detail: String(err.message || err),
      hint: 'Confirm the sheet is shared with the service account as Editor.',
    });
  }
}
