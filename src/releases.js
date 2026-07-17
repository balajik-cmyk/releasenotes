import { initSliders } from './slider.js';
import { initCompareVideos } from './compare-video.js';
import { initReveal } from './scroll-reveal.js';
import { initNavChrome } from './nav-preview.js';

// ── small DOM helpers ────────────────────────────────────────────────
function el(tag, className, attrs) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === true) node.setAttribute(k, '');
      else if (v !== false && v !== null && v !== undefined) node.setAttribute(k, v);
    }
  }
  return node;
}

// Render inline **bold** as <strong>. Text is inserted via textContent so it is
// always escaped — no raw HTML from the sheet reaches the DOM.
function richText(target, str) {
  const parts = String(str || '').split(/\*\*(.+?)\*\*/g);
  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      const strong = el('strong', 'font-medium text-ink');
      strong.textContent = part;
      target.appendChild(strong);
    } else if (part) {
      target.appendChild(document.createTextNode(part));
    }
  });
}

function resolveMediaUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (raw.startsWith('/')) return raw;
  try {
    const u = new URL(raw, window.location.origin);
    if (u.protocol === 'http:' || u.protocol === 'https:') return raw;
  } catch {
    return '';
  }
  return '';
}

function isSafeHttp(url) {
  const raw = String(url || '').trim();
  if (!raw) return false;
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function hexToRgba(hex, alpha) {
  const m = String(hex).trim().replace('#', '');
  if (!/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(m)) return `rgba(15,98,254,${alpha})`;
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const CHEVRON =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M8 5L3 12L8 19" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 5L21 12L16 19" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const BADGE_L = 'absolute top-3 left-3 z-[5] rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold tracking-[0.5px] text-white pointer-events-none';
const BADGE_R = 'absolute top-3 right-3 z-[5] rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold tracking-[0.5px] text-white pointer-events-none';

// ── media renderers ──────────────────────────────────────────────────
function renderImageCompare(section) {
  const wrap = el('div', 'mt-2');
  const frame = el(
    'div',
    'media-frame relative cursor-ew-resize touch-none select-none overflow-hidden rounded-lg border border-border bg-white',
    { 'data-compare-slider': true, 'data-start': String(section.startPct) }
  );

  const afterLayer = el('div', 'absolute inset-0');
  const afterImg = el('img', 'pointer-events-none h-full w-full object-cover object-left-top', {
    src: resolveMediaUrl(section.afterMedia),
    alt: section.afterLabel || 'After',
  });
  afterLayer.appendChild(afterImg);

  const clip = el('div', 'absolute inset-0 overflow-hidden', { 'data-before-clip': true });
  const inner = el('div', 'absolute inset-0', { 'data-before-inner': true });
  const beforeImg = el('img', 'pointer-events-none h-full w-full object-cover object-left-top', {
    src: resolveMediaUrl(section.beforeMedia),
    alt: section.beforeLabel || 'Before',
  });
  inner.appendChild(beforeImg);
  clip.appendChild(inner);

  const badgeL = el('div', BADGE_L);
  badgeL.textContent = section.beforeLabel || 'Before';
  const badgeR = el('div', BADGE_R);
  badgeR.textContent = section.afterLabel || 'After';

  const divider = el('div', 'pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 -translate-x-1/2 bg-brand', {
    'data-divider': true,
  });
  const handle = el(
    'div',
    'absolute top-1/2 z-20 flex h-[52px] w-[52px] -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full bg-brand shadow-[0_8px_24px_rgba(15,98,254,0.35)] outline-none transition-shadow hover:shadow-[0_10px_32px_rgba(15,98,254,0.45)] focus-visible:shadow-[0_8px_24px_rgba(15,98,254,0.35),0_0_0_3px_rgba(15,98,254,0.35)]',
    {
      'data-handle': true,
      role: 'slider',
      tabindex: '0',
      'aria-label': `${section.label || section.title} comparison`,
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-valuenow': String(section.startPct),
    }
  );
  handle.innerHTML = CHEVRON;

  frame.append(afterLayer, clip, badgeL, badgeR, divider, handle);
  wrap.appendChild(frame);
  return wrap;
}

function attachVideoSrc(video, src) {
  const url = resolveMediaUrl(src);
  // Prefer <source> children only — setting both video.src and <source> can leave
  // Chromium stuck on an empty/black QuickTime frame.
  video.removeAttribute('src');
  video.innerHTML = '';
  if (!url) return;
  // Prefer mp4 MIME first so Chromium attempts playback; Safari still accepts .mov.
  const mp4 = el('source', null, { src: url, type: 'video/mp4' });
  const qt = el('source', null, { src: url, type: 'video/quicktime' });
  video.append(mp4, qt);
  video.load();
}

function renderVideoCompare(section) {
  const wrap = el('div', 'mt-2', {
    'data-compare-video': true,
    'data-compare-name': section.label || section.title,
  });

  const tablist = el('div', 'mb-3 inline-flex rounded-lg border border-border bg-[#F7F7F7] p-1', {
    role: 'tablist',
    'aria-label': `${section.label || section.title} comparison`,
  });

  const beforeSafe = resolveMediaUrl(section.beforeMedia);
  const afterSafe = resolveMediaUrl(section.afterMedia);

  const tabBefore = el('button', 'rounded-[8px] bg-ink px-4 py-2 text-[13px] font-medium text-white transition-colors', {
    type: 'button',
    role: 'tab',
    'aria-selected': 'true',
    'data-compare-tab': true,
    'data-src': beforeSafe,
    'data-label': section.beforeLabel || 'Before',
  });
  tabBefore.textContent = section.beforeLabel || 'Before';

  const tabAfter = el('button', 'rounded-[8px] px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:text-ink', {
    type: 'button',
    role: 'tab',
    'aria-selected': 'false',
    'data-compare-tab': true,
    'data-src': afterSafe,
    'data-label': section.afterLabel || 'After',
  });
  tabAfter.textContent = section.afterLabel || 'After';
  tablist.append(tabBefore, tabAfter);

  const shell = el('div', 'overflow-hidden rounded-lg border border-border bg-[#111]');
  const frame = el('div', 'media-frame relative');
  const video = el('video', 'absolute inset-0 h-full w-full object-contain object-center', {
    'data-compare-player': true,
    muted: true,
    loop: true,
    playsinline: true,
    preload: 'auto',
    'aria-label': `${section.label || section.title} before`,
  });
  // Properties (not only attributes) are required for muted autoplay policies.
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute('webkit-playsinline', '');
  attachVideoSrc(video, beforeSafe);
  const badge = el('div', 'pointer-events-none absolute left-3 top-3 z-[2] rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold tracking-[0.5px] text-white', {
    'data-compare-badge': true,
  });
  badge.textContent = section.beforeLabel || 'Before';
  frame.append(video, badge);
  shell.appendChild(frame);
  wrap.append(tablist, shell);
  return wrap;
}

function colorColumn(hex, label, borderRight) {
  const col = el(
    'div',
    borderRight
      ? 'flex flex-col border-b border-border p-5 sm:border-b-0 sm:border-r'
      : 'flex flex-col p-5'
  );
  const kicker = el('div', 'mb-3 text-[11px] font-semibold uppercase tracking-[1.5px] text-faint');
  kicker.textContent = borderRight ? 'Before' : 'After';
  const swatch = el('div', 'mb-3 min-h-0 flex-1 rounded-lg', { role: 'img', 'aria-label': `${label} swatch` });
  swatch.style.background = hex;
  const name = el('div', 'mb-3 font-medium text-ink');
  name.textContent = label;
  const row = el('div', 'flex flex-wrap items-center gap-2');
  const primary = el('button', 'rounded-[8px] px-4 py-2 text-[13px] font-medium text-white', { type: 'button' });
  primary.style.background = hex;
  primary.textContent = 'Primary';
  const link = el('a', 'text-[13px] font-medium no-underline', { href: '#' });
  link.style.color = hex;
  link.textContent = 'Link';
  const active = el('span', 'rounded-full px-2.5 py-0.5 text-[11px] font-medium');
  active.style.background = hexToRgba(hex, 0.14);
  active.style.color = hex;
  active.textContent = 'Active';
  row.append(primary, link, active);
  col.append(kicker, swatch, name, row);
  return col;
}

function renderColorCompare(section) {
  const frame = el('div', 'media-frame flex flex-col overflow-hidden rounded-lg border border-border bg-white');
  const grid = el('div', 'grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-2');
  grid.append(
    colorColumn(section.beforeMedia, section.beforeLabel || section.beforeMedia, true),
    colorColumn(section.afterMedia, section.afterLabel || section.afterMedia, false)
  );
  frame.appendChild(grid);
  if (section.footer) {
    const footer = el('div', 'shrink-0 border-t border-border bg-[#F7F7F7] px-5 py-3.5 text-[13px] text-muted');
    richText(footer, section.footer);
    frame.appendChild(footer);
  }
  return frame;
}

function renderWhyBox(section, addBottomMargin) {
  if (!section.bullets.length) return null;
  const box = el('div', `${addBottomMargin ? 'mb-6 ' : ''}rounded-[10px] border border-border bg-[#F7F7F7] p-4`);
  if (section.whyTitle) {
    const title = el('div', 'mb-1.5 text-[11px] font-bold uppercase tracking-[1.5px] text-faint');
    title.textContent = section.whyTitle;
    box.appendChild(title);
  }
  const ul = el('ul', 'rn-note m-0 list-disc space-y-2 pl-5');
  for (const b of section.bullets) {
    const li = el('li');
    if (b.lead) {
      const strong = el('strong', 'font-medium text-ink');
      strong.textContent = b.lead;
      li.appendChild(strong);
      li.appendChild(document.createTextNode(' '));
    }
    richText(li, b.text);
    ul.appendChild(li);
  }
  box.appendChild(ul);
  return box;
}

function renderMedia(section) {
  switch (section.type) {
    case 'image_compare':
      return renderImageCompare(section);
    case 'video_compare':
      return renderVideoCompare(section);
    case 'color_compare':
      return renderColorCompare(section);
    default:
      return null;
  }
}

function renderSection(section, isLast) {
  const row = el(
    'div',
    `reveal rn-section${isLast ? ' rn-section-last' : ''} grid grid-cols-1 items-start gap-4 md:grid-cols-[200px_1fr] md:gap-12`,
    { 'data-reveal': true }
  );

  const left = el('div');
  if (section.label) {
    const chip = el('span', 'mb-3 inline-block rounded-full px-2.5 py-[3px] text-[11px] font-semibold tracking-[0.3px]');
    chip.style.background = section.labelBg;
    chip.style.color = section.labelColor;
    chip.textContent = section.label;
    left.appendChild(chip);
  }

  const right = el('div');
  const h2 = el('h2', 'rn-h2 font-sans');
  h2.textContent = section.title;
  right.appendChild(h2);

  if (section.body) {
    const p = el('p', 'rn-body mb-6');
    richText(p, section.body);
    right.appendChild(p);
  }

  const media = renderMedia(section);
  const why = renderWhyBox(section, Boolean(media));
  if (why) right.appendChild(why);
  if (media) right.appendChild(media);

  row.append(left, right);
  return row;
}

// ── hero ─────────────────────────────────────────────────────────────
function renderHero(site) {
  const badgeText = document.getElementById('hero-badge-text');
  const badge = document.getElementById('hero-badge');
  if (badgeText) badgeText.textContent = site.badgeText || '';
  if (badge) badge.hidden = !site.badgeText;

  const h1 = document.getElementById('hero-headline');
  if (h1) {
    h1.textContent = '';
    h1.appendChild(document.createTextNode(site.headlineLine1));
    h1.appendChild(el('br'));
    // Keep line 2 on one line from md up; allow wrap on narrow phones
    const span = el('span', 'md:whitespace-nowrap');
    span.textContent = site.headlineLine2;
    h1.appendChild(span);
  }

  const cta = document.getElementById('hero-preview');
  if (cta) {
    cta.textContent = site.ctaLabel || 'Preview →';
    if (isSafeHttp(site.ctaUrl)) cta.href = site.ctaUrl;
  }
  const navCta = document.getElementById('nav-preview');
  if (navCta && isSafeHttp(site.ctaUrl)) navCta.href = site.ctaUrl;

  if (site.pageTitle) document.title = site.pageTitle;
}

// ── boot ─────────────────────────────────────────────────────────────
async function load() {
  const container = document.getElementById('changes');
  const statusEl = document.getElementById('page-status');

  try {
    const res = await fetch('/api/content', { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Content request failed (${res.status})`);
    const data = await res.json();

    renderHero(data.site || {});

    container.textContent = '';
    if (!data.sections || !data.sections.length) {
      if (statusEl) statusEl.hidden = false;
      return;
    }
    if (statusEl) statusEl.hidden = true;

    data.sections.forEach((section, i) => {
      container.appendChild(renderSection(section, i === data.sections.length - 1));
    });

    initSliders(container);
    initCompareVideos(container);
    initReveal(container);
  } catch (err) {
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = 'Could not load the latest updates. Please refresh.';
    }
    // eslint-disable-next-line no-console
    console.error(err);
  } finally {
    initNavChrome();
  }
}

load();
