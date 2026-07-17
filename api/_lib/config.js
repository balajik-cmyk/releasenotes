// Central config: tab names and env resolution for the Google Sheets backend.

export const TABS = {
  siteConfig: 'site_config',
  sections: 'release_sections',
  bullets: 'section_bullets',
  settings: 'app_settings',
};

// Column order for each tab. The seed script writes these headers and every
// read/write helper relies on this exact ordering.
export const HEADERS = {
  [TABS.siteConfig]: ['key', 'value'],
  [TABS.sections]: [
    'id',
    'order',
    'visible',
    'label',
    'label_bg',
    'label_color',
    'title',
    'body',
    'type',
    'why_title',
    'before_media',
    'after_media',
    'before_label',
    'after_label',
    'footer',
    'start_pct',
  ],
  [TABS.bullets]: ['section_id', 'order', 'lead', 'text'],
  [TABS.settings]: ['key', 'value'],
};

export const SECTION_TYPES = ['image_compare', 'video_compare', 'color_compare', 'text'];

export function getServiceAccountEmail() {
  return process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
}

export function getPrivateKey() {
  const raw = process.env.GOOGLE_PRIVATE_KEY || '';
  // Support keys stored with literal \n (common in env vars).
  return raw.replace(/\\n/g, '\n');
}

// The default Sheet ID comes from the environment. The app_settings tab may
// override it at runtime so the admin can repoint without redeploying.
export function getDefaultSheetId() {
  return process.env.GOOGLE_SHEET_ID || '';
}

export function hasGoogleCredentials() {
  return Boolean(getServiceAccountEmail() && getPrivateKey());
}

function normalizeEnvValue(raw) {
  let v = String(raw || '').trim();
  // Strip accidental KEY= prefix when the whole .env line was pasted as the value.
  v = v.replace(/^BLOB_READ_WRITE_TOKEN=/, '');
  // Strip wrapping quotes from dashboard pastes.
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  // Recover the token if extra text was pasted around it.
  const match = v.match(/vercel_blob_rw_[A-Za-z0-9_]+/);
  return match ? match[0] : v.trim();
}

export function getBlobToken() {
  return normalizeEnvValue(process.env.BLOB_READ_WRITE_TOKEN);
}

export function hasBlobToken() {
  return Boolean(getBlobToken());
}
