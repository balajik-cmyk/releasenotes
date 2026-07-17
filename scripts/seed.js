// One-time seed: creates the tabs and fills them with the current page content.
// Usage: node scripts/seed.js [--force]
// Without --force it only writes tabs that are empty.

import 'dotenv/config';
import { TABS } from '../api/_lib/config.js';
import { readTab, writeTab } from '../api/_lib/sheets.js';
import { getDefaultSheetId } from '../api/_lib/config.js';

const force = process.argv.includes('--force');
const sheetId = getDefaultSheetId();

const siteConfig = [
  { key: 'badge_text', value: 'Coming August 2026' },
  { key: 'headline_line1', value: 'A cleaner Birdeye.' },
  { key: 'headline_line2', value: 'Built for how you work next.' },
  { key: 'cta_label', value: 'Preview the new look →' },
  { key: 'cta_url', value: 'https://preprod-ent-reportingapp.birdeye.com/dashboard/home' },
  { key: 'page_title', value: "What's New — Birdeye" },
];

const sections = [
  {
    id: 'settings-cta',
    order: 1,
    visible: true,
    label: 'Settings CTA',
    label_bg: '#E3F2FD',
    label_color: '#1565C0',
    title: 'Settings CTAs move from top to bottom',
    body: 'Settings actions leave the crowded top header and settle into the **left-rail footer**. Create and Ask stay up top; settings, notifications, and profile move down.',
    type: 'image_compare',
    why_title: 'Why design needs this',
    before_media: '/images/system-cta-before.png',
    after_media: '/images/system-cta-after.png',
    before_label: 'Before',
    after_label: 'After',
    footer: '',
    start_pct: 50,
  },
  {
    id: 'drawer',
    order: 2,
    visible: true,
    label: 'Drawer',
    label_bg: '#E8EAF6',
    label_color: '#3949AB',
    title: 'Drawer improvements',
    body: 'Drawers open with clearer hierarchy, tighter spacing, and smoother motion — easier to scan and act without losing context of the page behind.',
    type: 'video_compare',
    why_title: 'Why design needs this',
    before_media: '/videos/drawer-before.mov',
    after_media: '/videos/drawer-after.mov',
    before_label: 'Before',
    after_label: 'After',
    footer: '',
    start_pct: 50,
  },
  {
    id: 'navigation',
    order: 3,
    visible: true,
    label: 'Navigation',
    label_bg: '#E0F2F1',
    label_color: '#00695C',
    title: 'Expand or collapse the left menu — same everywhere',
    body: 'Open for full labels when you need them. Close for more screen space. One control, same behavior in every module.',
    type: 'video_compare',
    why_title: 'Why',
    before_media: '/videos/l1-nav-before.mov',
    after_media: '/videos/l1-nav-after.mov',
    before_label: 'Before',
    after_label: 'After',
    footer: '',
    start_pct: 50,
  },
  {
    id: 'branding',
    order: 4,
    visible: true,
    label: 'Branding',
    label_bg: '#EDEFFF',
    label_color: '#4C5BD4',
    title: 'Branding looks softer — your brand color moves from the top strip into the app background',
    body: '',
    type: 'image_compare',
    why_title: '',
    before_media: '/images/branding-shell-before.png',
    after_media: '/images/branding-shell-after.png',
    before_label: 'Before',
    after_label: 'After',
    footer: '',
    start_pct: 50,
  },
  {
    id: 'brand-blue',
    order: 5,
    visible: true,
    label: 'Brand blue',
    label_bg: '#EDF5FF',
    label_color: '#0F62FE',
    title: 'From Material blue to IBM Blue',
    body: '**#1976D2** → **#0F62FE** on buttons, links, focus, and accents.',
    type: 'color_compare',
    why_title: 'Why',
    before_media: '#1976D2',
    after_media: '#0F62FE',
    before_label: '#1976D2',
    after_label: '#0F62FE · IBM Blue',
    footer: '**Bottom line:** better on screen, clearer in product, trusted in enterprise.',
    start_pct: 50,
  },
  {
    id: 'typography',
    order: 6,
    visible: true,
    label: 'Typography',
    label_bg: '#EDF5FF',
    label_color: '#0F62FE',
    title: 'Inter becomes the primary typeface',
    body: "We're moving to **Inter** as the primary typeface across the entire dashboard. The previous mixed type stack is being retired.",
    type: 'text',
    why_title: 'Why design needs this',
    before_media: '',
    after_media: '',
    before_label: '',
    after_label: '',
    footer: '',
    start_pct: 50,
  },
];

const bullets = [
  // settings-cta
  { section_id: 'settings-cta', order: 1, lead: 'Clear workspace.', text: 'Top chrome stays focused on create/ask; account and system tools stop competing with page content.' },
  { section_id: 'settings-cta', order: 2, lead: 'Thumb- and habit-friendly.', text: 'Settings, notifications, and profile live in a stable bottom-rail destination users already expect in modern app shells.' },
  { section_id: 'settings-cta', order: 3, lead: 'Scalable system actions.', text: 'New utilities can join the bottom cluster without growing the header into a dense icon strip.' },
  // drawer
  { section_id: 'drawer', order: 1, lead: 'Faster orientation.', text: 'Stronger title, actions, and content rhythm so users know what to do in one glance.' },
  { section_id: 'drawer', order: 2, lead: 'Less visual noise.', text: 'Refined panels keep focus on the task instead of chrome and dense controls.' },
  { section_id: 'drawer', order: 3, lead: 'Motion with purpose.', text: 'Enter/exit feel intentional and calm — aligned with the AI Native experience.' },
  // navigation
  { section_id: 'navigation', order: 1, lead: 'Your choice.', text: 'Expand when learning the menu; collapse when deep in work.' },
  { section_id: 'navigation', order: 2, lead: 'Same in every module.', text: 'No surprises jumping from Reviews to Listings to Inbox.' },
  { section_id: 'navigation', order: 3, lead: 'More room for content.', text: 'Collapsed rail gives the page back without losing navigation.' },
  // brand-blue
  { section_id: 'brand-blue', order: 1, lead: 'Looks better.', text: 'Sharper and more confident on white UI.' },
  { section_id: 'brand-blue', order: 2, lead: 'Feels enterprise.', text: 'Trust signal — not a Material default.' },
  { section_id: 'brand-blue', order: 3, lead: 'Clearer actions.', text: 'CTAs and active states pop faster.' },
  { section_id: 'brand-blue', order: 4, lead: 'One system blue.', text: 'Same accent across product and AI Native.' },
  // typography
  { section_id: 'typography', order: 1, lead: 'One voice.', text: 'A single UI typeface keeps nav, headings, and body copy in the same rhythm.' },
  { section_id: 'typography', order: 2, lead: 'Sharper hierarchy.', text: "Inter's weights make dense dashboards easier to scan without increasing font size." },
  { section_id: 'typography', order: 3, lead: 'AI Native alignment.', text: 'A modern, consistent typeface keeps the dashboard visually continuous with the next product tier.' },
];

async function isEmpty(tab) {
  const rows = await readTab(sheetId, tab).catch(() => []);
  return rows.length === 0;
}

async function main() {
  if (!sheetId) {
    console.error('GOOGLE_SHEET_ID is not set. Check your .env file.');
    process.exit(1);
  }
  console.log(`Seeding sheet ${sheetId} ${force ? '(force)' : '(only empty tabs)'}`);

  const tasks = [
    [TABS.siteConfig, siteConfig],
    [TABS.sections, sections],
    [TABS.bullets, bullets],
    [TABS.settings, []],
  ];

  for (const [tab, data] of tasks) {
    const empty = await isEmpty(tab);
    if (!empty && !force) {
      console.log(`  skip ${tab} (not empty)`);
      continue;
    }
    await writeTab(sheetId, tab, data);
    console.log(`  wrote ${tab} (${data.length} rows)`);
  }
  console.log('Seed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err.message || err);
  process.exit(1);
});
