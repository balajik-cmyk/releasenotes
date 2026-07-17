import { SECTION_TYPES } from './config.js';

function toBool(v) {
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === '1';
}

function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// Build the normalized content object the public page consumes.
export function buildContent({ siteConfigRows, sectionRows, bulletRows }) {
  const config = {};
  for (const row of siteConfigRows) {
    if (row.key) config[String(row.key).trim()] = row.value;
  }

  const bulletsBySection = new Map();
  for (const b of bulletRows) {
    const sid = String(b.section_id || '').trim();
    if (!sid) continue;
    if (!bulletsBySection.has(sid)) bulletsBySection.set(sid, []);
    bulletsBySection.get(sid).push({
      order: toNum(b.order, 0),
      lead: String(b.lead || ''),
      text: String(b.text || ''),
    });
  }
  for (const arr of bulletsBySection.values()) arr.sort((a, b) => a.order - b.order);

  const sections = sectionRows
    .map((r) => {
      const id = String(r.id || '').trim();
      if (!id) return null;
      const type = SECTION_TYPES.includes(String(r.type).trim())
        ? String(r.type).trim()
        : 'text';
      return {
        id,
        order: toNum(r.order, 0),
        visible: toBool(r.visible),
        label: String(r.label || ''),
        labelBg: String(r.label_bg || '#EDF5FF'),
        labelColor: String(r.label_color || '#0F62FE'),
        title: String(r.title || ''),
        body: String(r.body || ''),
        type,
        whyTitle: String(r.why_title || ''),
        beforeMedia: String(r.before_media || ''),
        afterMedia: String(r.after_media || ''),
        beforeLabel: String(r.before_label || 'Before'),
        afterLabel: String(r.after_label || 'After'),
        footer: String(r.footer || ''),
        startPct: toNum(r.start_pct, 50),
        bullets: bulletsBySection.get(id) || [],
      };
    })
    .filter(Boolean)
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  return {
    site: {
      badgeText: config.badge_text || '',
      headlineLine1: config.headline_line1 || '',
      headlineLine2: config.headline_line2 || '',
      ctaLabel: config.cta_label || '',
      ctaUrl: config.cta_url || '',
      pageTitle: config.page_title || "What's New",
    },
    sections,
  };
}

// Validate a section payload coming from the admin editor. Returns
// { ok, errors, value }.
export function validateSection(input) {
  const errors = [];
  const value = {
    id: String(input.id || '').trim(),
    order: toNum(input.order, 0),
    visible: input.visible === undefined ? true : toBool(input.visible),
    label: String(input.label || '').trim(),
    label_bg: String(input.labelBg || input.label_bg || '#EDF5FF').trim(),
    label_color: String(input.labelColor || input.label_color || '#0F62FE').trim(),
    title: String(input.title || '').trim(),
    body: String(input.body || '').trim(),
    type: String(input.type || 'text').trim(),
    why_title: String(input.whyTitle || input.why_title || '').trim(),
    before_media: String(input.beforeMedia || input.before_media || '').trim(),
    after_media: String(input.afterMedia || input.after_media || '').trim(),
    before_label: String(input.beforeLabel || input.before_label || 'Before').trim(),
    after_label: String(input.afterLabel || input.after_label || 'After').trim(),
    footer: String(input.footer || '').trim(),
    start_pct: toNum(input.startPct ?? input.start_pct, 50),
  };

  if (!SECTION_TYPES.includes(value.type)) {
    errors.push(`type must be one of: ${SECTION_TYPES.join(', ')}`);
  }
  if (!value.title) errors.push('title is required');
  if (value.type === 'image_compare' || value.type === 'video_compare') {
    if (!value.before_media) errors.push('before_media is required for this type');
    if (!value.after_media) errors.push('after_media is required for this type');
  }
  if (value.type === 'color_compare') {
    if (!value.before_media) errors.push('before color is required');
    if (!value.after_media) errors.push('after color is required');
  }
  value.start_pct = Math.max(0, Math.min(100, value.start_pct));

  return { ok: errors.length === 0, errors, value };
}

export function normalizeBullets(sectionId, bullets) {
  if (!Array.isArray(bullets)) return [];
  return bullets
    .map((b, idx) => ({
      section_id: sectionId,
      order: toNum(b.order, idx),
      lead: String(b.lead || '').trim(),
      text: String(b.text || '').trim(),
    }))
    .filter((b) => b.lead || b.text);
}
