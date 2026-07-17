// Admin editor for the Google Sheets-backed What's New page. No auth (prototype).

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = data?.error || `Request failed (${res.status})`;
    const detail = data?.detail ? ` — ${data.detail}` : '';
    const errors = data?.errors ? ` — ${data.errors.join('; ')}` : '';
    throw new Error(msg + detail + errors);
  }
  return data;
}

// ── Connection panel ─────────────────────────────────────────────────
const connStatus = $('#conn-status');

function setConn(html, tone = 'muted') {
  const color = tone === 'ok' ? 'text-[#1E7E34]' : tone === 'err' ? 'text-[#C0392B]' : 'text-muted';
  connStatus.className = `mt-4 text-[13px] ${color}`;
  connStatus.innerHTML = html;
}

async function loadSettings() {
  try {
    const s = await api('/api/settings');
    $('#sheet-url').value = s.activeSheetId || s.defaultSheetId || '';
  } catch (err) {
    setConn(`Could not read settings: ${err.message}`, 'err');
  }
}

async function fetchTabs() {
  setConn('Checking connection…');
  try {
    const h = await api('/api/health');
    const rows = h.tabs
      .map(
        (t) =>
          `<tr><td class="py-1 pr-4 font-medium">${escapeHtml(t.title)}</td><td class="py-1 pr-4 text-muted">${t.rows} rows</td><td class="py-1 text-muted">${t.columns} cols</td></tr>`
      )
      .join('');
    const blob = h.hasBlob ? '' : ' · <span class="text-[#C0392B]">Blob token missing (uploads disabled)</span>';
    setConn(
      `Connected to <strong>${escapeHtml(h.title)}</strong> as <code>${escapeHtml(h.serviceAccount)}</code>${blob}<table class="mt-3 w-full text-left text-[13px]"><tbody>${rows}</tbody></table>`,
      'ok'
    );
  } catch (err) {
    setConn(`${err.message}`, 'err');
  }
}

async function saveSheet() {
  const sheetUrl = $('#sheet-url').value.trim();
  if (!sheetUrl) return;
  setConn('Saving sheet…');
  try {
    await api('/api/settings', { method: 'PUT', body: JSON.stringify({ sheetUrl }) });
    setConn('Sheet saved. Reloading data…', 'ok');
    await Promise.all([loadHero(), loadSections()]);
    await fetchTabs();
  } catch (err) {
    setConn(err.message, 'err');
  }
}

// ── Hero ─────────────────────────────────────────────────────────────
async function loadHero() {
  try {
    const { config } = await api('/api/site-config');
    $$('[data-hero]').forEach((input) => {
      input.value = config[input.dataset.hero] || '';
    });
  } catch (err) {
    $('#hero-status').textContent = err.message;
  }
}

async function saveHero() {
  const config = {};
  $$('[data-hero]').forEach((input) => {
    config[input.dataset.hero] = input.value;
  });
  const status = $('#hero-status');
  status.textContent = 'Saving…';
  try {
    await api('/api/site-config', { method: 'PUT', body: JSON.stringify({ config }) });
    status.textContent = 'Saved.';
    setTimeout(() => (status.textContent = ''), 2000);
  } catch (err) {
    status.textContent = err.message;
  }
}

// ── Sections list ────────────────────────────────────────────────────
let sections = [];

async function loadSections() {
  const list = $('#sections-list');
  list.innerHTML = '';
  try {
    const data = await api('/api/sections');
    sections = data.sections || [];
    $('#sections-empty').hidden = sections.length > 0;
    sections.forEach((s, idx) => list.appendChild(renderSectionRow(s, idx)));
  } catch (err) {
    list.innerHTML = `<p class="text-[13px] text-[#C0392B]">${escapeHtml(err.message)}</p>`;
  }
}

function renderSectionRow(section, idx) {
  const row = document.createElement('div');
  row.className = 'flex items-center gap-3 rounded-[10px] border border-border bg-white p-3';
  const visible = String(section.visible).toLowerCase() === 'true' || section.visible === true;
  row.innerHTML = `
    <div class="flex flex-col gap-1">
      <button data-move="up" ${idx === 0 ? 'disabled' : ''} class="rounded border border-border px-1.5 text-[12px] leading-none disabled:opacity-30">▲</button>
      <button data-move="down" ${idx === sections.length - 1 ? 'disabled' : ''} class="rounded border border-border px-1.5 text-[12px] leading-none disabled:opacity-30">▼</button>
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <span class="truncate text-[14px] font-medium">${escapeHtml(section.title || '(untitled)')}</span>
        <span class="rounded-full bg-[#F2F2F2] px-2 py-0.5 text-[11px] text-muted">${escapeHtml(section.type || 'text')}</span>
      </div>
      <div class="truncate text-[12px] text-muted">${escapeHtml(section.label || '')} · id: ${escapeHtml(section.id)}</div>
    </div>
    <label class="flex items-center gap-1 text-[12px] text-muted"><input type="checkbox" data-toggle ${visible ? 'checked' : ''}/> Visible</label>
    <button data-edit class="rounded-[8px] border border-border px-3 py-1.5 text-[13px] font-medium hover:bg-[#F2F2F2]">Edit</button>
    <button data-delete class="rounded-[8px] border border-border px-3 py-1.5 text-[13px] font-medium text-[#C0392B] hover:bg-[#FDECEA]">Delete</button>
  `;

  $('[data-edit]', row).addEventListener('click', () => openDialog(section));
  $('[data-delete]', row).addEventListener('click', () => deleteSection(section));
  $('[data-toggle]', row).addEventListener('change', (e) => toggleVisible(section, e.target.checked));
  $('[data-move="up"]', row).addEventListener('click', () => moveSection(idx, -1));
  $('[data-move="down"]', row).addEventListener('click', () => moveSection(idx, 1));
  return row;
}

async function moveSection(idx, dir) {
  const target = idx + dir;
  if (target < 0 || target >= sections.length) return;
  const ids = sections.map((s) => s.id);
  [ids[idx], ids[target]] = [ids[target], ids[idx]];
  await api('/api/sections', {
    method: 'POST',
    body: JSON.stringify({ action: 'reorder', orderedIds: ids }),
  });
  await loadSections();
}

async function toggleVisible(section, visible) {
  await api('/api/sections', {
    method: 'PUT',
    body: JSON.stringify({ ...serializeExisting(section), visible }),
  });
  await loadSections();
}

async function deleteSection(section) {
  if (!confirm(`Delete "${section.title || section.id}"?`)) return;
  await api('/api/sections', { method: 'DELETE', body: JSON.stringify({ id: section.id }) });
  await loadSections();
}

// Map a raw sheet row (snake_case) to the camelCase payload the API accepts.
function serializeExisting(section) {
  return {
    id: section.id,
    order: section.order,
    visible: section.visible,
    label: section.label,
    labelBg: section.label_bg,
    labelColor: section.label_color,
    title: section.title,
    body: section.body,
    type: section.type,
    whyTitle: section.why_title,
    beforeMedia: section.before_media,
    afterMedia: section.after_media,
    beforeLabel: section.before_label,
    afterLabel: section.after_label,
    footer: section.footer,
    startPct: section.start_pct,
    bullets: section.bullets || [],
  };
}

// ── Section dialog ───────────────────────────────────────────────────
const dialog = $('#section-dialog');
let editingId = null;

function openDialog(section) {
  editingId = section ? section.id : null;
  $('#dialog-title').textContent = section ? 'Edit section' : 'Add section';
  $('#dialog-error').textContent = '';

  const data = section
    ? serializeExisting(section)
    : {
        id: '',
        title: '',
        label: '',
        labelBg: '#EDF5FF',
        labelColor: '#0F62FE',
        type: 'text',
        body: '',
        whyTitle: '',
        beforeMedia: '',
        afterMedia: '',
        beforeLabel: 'Before',
        afterLabel: 'After',
        footer: '',
        startPct: 50,
        visible: true,
        bullets: [],
      };

  $$('[data-field]').forEach((input) => {
    const key = input.dataset.field;
    if (input.type === 'checkbox') {
      input.checked = data[key] === true || String(data[key]).toLowerCase() === 'true';
    } else {
      input.value = data[key] ?? '';
    }
  });

  renderBullets(data.bullets || []);
  updateMediaVisibility();
  dialog.showModal();
}

function renderBullets(bullets) {
  const list = $('#bullets-list');
  list.innerHTML = '';
  (bullets.length ? bullets : []).forEach((b) => list.appendChild(bulletRow(b)));
}

function bulletRow(b = { lead: '', text: '' }) {
  const row = document.createElement('div');
  row.className = 'flex items-start gap-2';
  row.innerHTML = `
    <input data-bullet-lead placeholder="Bold lead" value="${escapeAttr(b.lead || '')}" class="w-[34%] rounded-[8px] border border-border px-2.5 py-1.5 text-[13px] outline-none focus:border-brand" />
    <input data-bullet-text placeholder="Supporting text" value="${escapeAttr(b.text || '')}" class="flex-1 rounded-[8px] border border-border px-2.5 py-1.5 text-[13px] outline-none focus:border-brand" />
    <button type="button" data-bullet-remove class="rounded-[6px] border border-border px-2 py-1.5 text-[12px] text-[#C0392B] hover:bg-[#FDECEA]">✕</button>
  `;
  $('[data-bullet-remove]', row).addEventListener('click', () => row.remove());
  return row;
}

function updateMediaVisibility() {
  const type = $('[data-field="type"]').value;
  const block = $('[data-media-block]');
  const isMedia = type === 'image_compare' || type === 'video_compare' || type === 'color_compare';
  block.hidden = !isMedia;
  const isColor = type === 'color_compare';
  $('[data-media-heading]').textContent = isColor
    ? 'Colors (hex)'
    : type === 'video_compare'
      ? 'Videos'
      : 'Images';
  // Media tool buttons (upload/import) make no sense for color hex values.
  $$('[data-media-tools]').forEach((t) => (t.style.display = isColor ? 'none' : 'flex'));
  $$('[data-preview]').forEach((p) => (p.textContent = ''));
}

function collectPayload() {
  const payload = {};
  $$('[data-field]').forEach((input) => {
    const key = input.dataset.field;
    payload[key] = input.type === 'checkbox' ? input.checked : input.value.trim();
  });
  payload.bullets = $$('#bullets-list > div').map((row, i) => ({
    order: i + 1,
    lead: $('[data-bullet-lead]', row).value.trim(),
    text: $('[data-bullet-text]', row).value.trim(),
  }));
  return payload;
}

async function saveDialog() {
  const payload = collectPayload();
  $('#dialog-error').textContent = 'Saving…';
  try {
    if (editingId) {
      payload.id = editingId;
      await api('/api/sections', { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await api('/api/sections', { method: 'POST', body: JSON.stringify(payload) });
    }
    dialog.close();
    await loadSections();
  } catch (err) {
    $('#dialog-error').textContent = err.message;
  }
}

// ── Media upload / import ────────────────────────────────────────────
async function uploadFile(field, file) {
  const preview = $(`[data-preview="${field}"]`);
  preview.textContent = 'Uploading…';
  try {
    const res = await fetch(`/api/media/upload?filename=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || data?.error || 'Upload failed');
    $(`[data-field="${field}"]`).value = data.url;
    preview.textContent = 'Uploaded ✓';
  } catch (err) {
    preview.textContent = err.message;
  }
}

async function importUrl(field) {
  const url = prompt('Paste a public image/video URL (or Google Drive share link):');
  if (!url) return;
  const preview = $(`[data-preview="${field}"]`);
  preview.textContent = 'Importing…';
  try {
    const data = await api('/api/media/import', { method: 'POST', body: JSON.stringify({ url }) });
    $(`[data-field="${field}"]`).value = data.url;
    preview.textContent = 'Imported ✓';
  } catch (err) {
    preview.textContent = err.message;
  }
}

// ── helpers ──────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

// ── wire up ──────────────────────────────────────────────────────────
$('#fetch-tabs').addEventListener('click', fetchTabs);
$('#save-sheet').addEventListener('click', saveSheet);
$('#save-hero').addEventListener('click', saveHero);
$('#add-section').addEventListener('click', () => openDialog(null));
$('#add-bullet').addEventListener('click', () => $('#bullets-list').appendChild(bulletRow()));
$('#dialog-cancel').addEventListener('click', () => dialog.close());
$('#dialog-save').addEventListener('click', saveDialog);
$('[data-field="type"]').addEventListener('change', updateMediaVisibility);

$$('[data-upload]').forEach((input) =>
  input.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(input.dataset.upload, file);
    e.target.value = '';
  })
);
$$('[data-import]').forEach((btn) =>
  btn.addEventListener('click', () => importUrl(btn.dataset.import))
);

(async function init() {
  await loadSettings();
  await Promise.all([loadHero(), loadSections()]);
  await fetchTabs();
})();
