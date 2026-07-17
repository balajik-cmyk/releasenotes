import { google } from 'googleapis';
import {
  TABS,
  HEADERS,
  getServiceAccountEmail,
  getPrivateKey,
  getDefaultSheetId,
} from './config.js';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

let cachedClient = null;

function getSheetsClient() {
  if (cachedClient) return cachedClient;
  const auth = new google.auth.JWT({
    email: getServiceAccountEmail(),
    key: getPrivateKey(),
    scopes: SCOPES,
  });
  cachedClient = google.sheets({ version: 'v4', auth });
  return cachedClient;
}

// Resolve which sheet to read/write. Falls back to the env default. We read the
// app_settings tab (from the env sheet) so the admin can repoint at runtime.
let cachedActiveId = null;
export async function getActiveSheetId() {
  if (cachedActiveId) return cachedActiveId;
  const envId = getDefaultSheetId();
  try {
    const settings = await readTab(envId, TABS.settings);
    const row = settings.find((r) => r.key === 'active_sheet_id');
    cachedActiveId = row && row.value ? row.value.trim() : envId;
  } catch {
    cachedActiveId = envId;
  }
  return cachedActiveId;
}

export function clearActiveSheetCache() {
  cachedActiveId = null;
}

export async function getSpreadsheetMeta(spreadsheetId) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'properties.title,sheets.properties(title,sheetId,gridProperties)',
  });
  return {
    title: res.data.properties?.title || '',
    tabs: (res.data.sheets || []).map((s) => ({
      title: s.properties?.title || '',
      rows: s.properties?.gridProperties?.rowCount || 0,
      columns: s.properties?.gridProperties?.columnCount || 0,
    })),
  };
}

// Read a tab and return array of row objects keyed by header. Uses the first
// row as the header when it matches a known schema; otherwise falls back to the
// configured HEADERS for that tab.
export async function readTab(spreadsheetId, tabName) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}`,
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  const values = res.data.values || [];
  if (values.length === 0) return [];
  const header = values[0].map((h) => String(h).trim());
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const raw = values[i];
    if (!raw || raw.every((c) => c === '' || c === null || c === undefined)) continue;
    const obj = {};
    header.forEach((key, idx) => {
      obj[key] = raw[idx] === undefined || raw[idx] === null ? '' : raw[idx];
    });
    rows.push(obj);
  }
  return rows;
}

async function ensureTab(spreadsheetId, tabName) {
  const meta = await getSpreadsheetMeta(spreadsheetId);
  const exists = meta.tabs.some((t) => t.title === tabName);
  if (exists) return;
  const sheets = getSheetsClient();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ addSheet: { properties: { title: tabName } } }] },
  });
}

// Overwrite an entire tab with a header row plus data rows built from the
// configured HEADERS ordering. rowsObjects is an array of plain objects.
export async function writeTab(spreadsheetId, tabName, rowsObjects) {
  await ensureTab(spreadsheetId, tabName);
  const sheets = getSheetsClient();
  const header = HEADERS[tabName];
  const matrix = [header];
  for (const obj of rowsObjects) {
    matrix.push(header.map((key) => (obj[key] === undefined || obj[key] === null ? '' : obj[key])));
  }
  // Clear then write to drop any stale rows.
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${tabName}` });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: matrix },
  });
}
