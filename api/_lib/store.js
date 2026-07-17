import { TABS } from './config.js';
import { readTab, writeTab, getActiveSheetId } from './sheets.js';
import { buildContent, validateSection, normalizeBullets } from './schema.js';

export async function readAll(sheetId) {
  const [siteConfigRows, sectionRows, bulletRows] = await Promise.all([
    readTab(sheetId, TABS.siteConfig).catch(() => []),
    readTab(sheetId, TABS.sections).catch(() => []),
    readTab(sheetId, TABS.bullets).catch(() => []),
  ]);
  return { siteConfigRows, sectionRows, bulletRows };
}

export async function getContent() {
  const sheetId = await getActiveSheetId();
  const data = await readAll(sheetId);
  return buildContent(data);
}

// Raw section rows (unfiltered, includes hidden) for the admin editor.
export async function getRawSections() {
  const sheetId = await getActiveSheetId();
  const [sectionRows, bulletRows] = await Promise.all([
    readTab(sheetId, TABS.sections).catch(() => []),
    readTab(sheetId, TABS.bullets).catch(() => []),
  ]);
  const bulletsBySection = new Map();
  for (const b of bulletRows) {
    const sid = String(b.section_id || '').trim();
    if (!sid) continue;
    if (!bulletsBySection.has(sid)) bulletsBySection.set(sid, []);
    bulletsBySection.get(sid).push({
      order: Number(b.order) || 0,
      lead: String(b.lead || ''),
      text: String(b.text || ''),
    });
  }
  for (const arr of bulletsBySection.values()) arr.sort((a, b) => a.order - b.order);

  return sectionRows
    .map((r) => ({ ...r, bullets: bulletsBySection.get(String(r.id).trim()) || [] }))
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
}

function nextId(rows) {
  const ids = rows.map((r) => String(r.id || ''));
  let n = rows.length + 1;
  let candidate = `sec-${n}`;
  while (ids.includes(candidate)) {
    n += 1;
    candidate = `sec-${n}`;
  }
  return candidate;
}

async function persist(sheetId, sectionRows, bulletRows) {
  await writeTab(sheetId, TABS.sections, sectionRows);
  await writeTab(sheetId, TABS.bullets, bulletRows);
}

// Rebuild the bullet tab from a map of sectionId -> section row's bullets.
function rebuildBulletRows(sectionsWithBullets) {
  const out = [];
  for (const s of sectionsWithBullets) {
    const rows = normalizeBullets(s.id, s.bullets || []);
    out.push(...rows);
  }
  return out;
}

export async function createSection(payload) {
  const sheetId = await getActiveSheetId();
  const { siteConfigRows: _c, sectionRows, bulletRows } = await readAll(sheetId);
  const existingSections = await getRawSections();

  const { ok, errors, value } = validateSection(payload);
  if (!ok) return { ok: false, errors };
  if (!value.id) value.id = nextId(sectionRows);
  if (sectionRows.some((r) => String(r.id).trim() === value.id)) {
    return { ok: false, errors: [`Section id "${value.id}" already exists`] };
  }
  if (!value.order) value.order = existingSections.length + 1;

  const newSections = [...sectionRows, value];
  const withBullets = newSections.map((r) => ({
    id: String(r.id).trim(),
    bullets:
      String(r.id).trim() === value.id
        ? payload.bullets || []
        : (existingSections.find((s) => String(s.id).trim() === String(r.id).trim())?.bullets || []),
  }));
  const newBullets = rebuildBulletRows(withBullets);
  await persist(sheetId, newSections, newBullets);
  return { ok: true, id: value.id };
}

export async function updateSection(payload) {
  const sheetId = await getActiveSheetId();
  const { sectionRows } = await readAll(sheetId);
  const existingSections = await getRawSections();

  const { ok, errors, value } = validateSection(payload);
  if (!ok) return { ok: false, errors };
  const idx = sectionRows.findIndex((r) => String(r.id).trim() === value.id);
  if (idx === -1) return { ok: false, errors: [`Section "${value.id}" not found`] };

  // Preserve order unless explicitly provided.
  if (!payload.order && !payload.order === 0) value.order = Number(sectionRows[idx].order) || value.order;
  const newSections = sectionRows.map((r) => (String(r.id).trim() === value.id ? value : r));
  const withBullets = newSections.map((r) => ({
    id: String(r.id).trim(),
    bullets:
      String(r.id).trim() === value.id
        ? payload.bullets || []
        : (existingSections.find((s) => String(s.id).trim() === String(r.id).trim())?.bullets || []),
  }));
  await persist(sheetId, newSections, rebuildBulletRows(withBullets));
  return { ok: true, id: value.id };
}

export async function deleteSection(id) {
  const sheetId = await getActiveSheetId();
  const sid = String(id || '').trim();
  const { sectionRows } = await readAll(sheetId);
  const existingSections = await getRawSections();
  const newSections = sectionRows.filter((r) => String(r.id).trim() !== sid);
  if (newSections.length === sectionRows.length) {
    return { ok: false, errors: [`Section "${sid}" not found`] };
  }
  const withBullets = newSections.map((r) => ({
    id: String(r.id).trim(),
    bullets: existingSections.find((s) => String(s.id).trim() === String(r.id).trim())?.bullets || [],
  }));
  await persist(sheetId, newSections, rebuildBulletRows(withBullets));
  return { ok: true };
}

export async function reorderSections(orderedIds) {
  const sheetId = await getActiveSheetId();
  const { sectionRows } = await readAll(sheetId);
  const existingSections = await getRawSections();
  const orderMap = new Map(orderedIds.map((id, i) => [String(id).trim(), i + 1]));
  const newSections = sectionRows
    .map((r) => ({ ...r, order: orderMap.get(String(r.id).trim()) ?? Number(r.order) ?? 999 }))
    .sort((a, b) => a.order - b.order);
  const withBullets = newSections.map((r) => ({
    id: String(r.id).trim(),
    bullets: existingSections.find((s) => String(s.id).trim() === String(r.id).trim())?.bullets || [],
  }));
  await persist(sheetId, newSections, rebuildBulletRows(withBullets));
  return { ok: true };
}

export async function getSiteConfig() {
  const sheetId = await getActiveSheetId();
  const rows = await readTab(sheetId, TABS.siteConfig).catch(() => []);
  const config = {};
  for (const r of rows) if (r.key) config[String(r.key).trim()] = r.value;
  return config;
}

export async function saveSiteConfig(config) {
  const sheetId = await getActiveSheetId();
  const allowed = [
    'badge_text',
    'headline_line1',
    'headline_line2',
    'cta_label',
    'cta_url',
    'page_title',
  ];
  const rows = allowed.map((key) => ({ key, value: String(config[key] ?? '') }));
  await writeTab(sheetId, TABS.siteConfig, rows);
  return { ok: true };
}
