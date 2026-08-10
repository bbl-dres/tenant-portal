// One-shot migration: split css/styles.css + css/tokens.css into the
// design-system-mirroring structure under css/ (Phase B of the design
// review). Chunk ranges are 1-based inclusive line numbers into the
// ORIGINAL css/styles.css as of commit a30d08c; the tool is not meant to
// be re-run after the originals are deleted — it is committed for
// traceability of exactly how the monolith was cut.
//
// Guarantees aimed for (verified by scripts/review/diff-baseline.mjs):
// - every source line lands in exactly one target file (audited below),
// - within a file, chunks keep their original relative order,
// - the import order in css/main.css preserves the original cascade:
//   files are ordered by their dominant chunk's original position, and
//   every chunk moved across other rules was checked for selector
//   isolation (no other rule targets the same class names).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import process from 'node:process';

const src = readFileSync('css/styles.css', 'utf8').split(/\r?\n/);
const tokensSrc = readFileSync('css/tokens.css', 'utf8');

// {s, e} — lines s..e inclusive. {wrap} re-wraps the lines (taken from
// inside a source @media block that is being split across files) in the
// given media condition.
const FILES = [
  {
    file: 'foundations/tokens.css',
    header: null, // content taken verbatim from css/tokens.css
  },
  {
    file: 'layouts/layout.css',
    header: `Page scaffold + generic layout objects.
   Sources: styles.css LAYOUT (30-174), HERO (1074-1102), hero mobile
   override (3876-3877). The page-header block lives in
   components/tables.css: its .page-header__title margin override must
   cascade AFTER the .h1 utility (foundations/typography.css), which this
   file precedes.
   DS counterparts: layouts/container.postcss, layouts/section.postcss,
   sections/hero.postcss.`,
    chunks: [
      { s: 30, e: 174 },
      { s: 1074, e: 1102 },
      { s: 3876, e: 3877, wrap: '@media (max-width: 480px)' },
    ],
  },
  {
    file: 'navigations/header.css',
    header: `Federal chrome: top bar (incl. language switcher, demo chip) and
   brand bar (logo lockup, header search, meta links).
   Sources: styles.css 175-620, mobile overrides 3634-3686 + 3792-3793
   (from the former RESPONSIVE block) and 3871-3872. Navigation-owned
   strays 3614-3626 live in main-navigation.css.
   DS counterparts: sections/top-bar.postcss, sections/top-header.postcss,
   components/logo.postcss, components/language-switcher.postcss,
   components/search.postcss.`,
    chunks: [
      { s: 175, e: 620 },
      { s: 3634, e: 3686, wrap: '@media (max-width: 1023.98px)' },
      { s: 3792, e: 3793, wrap: '@media (max-width: 1023.98px)' },
      { s: 3871, e: 3872, wrap: '@media (max-width: 768px)' },
    ],
  },
  {
    file: 'navigations/main-navigation.css',
    header: `Navbar, nav dropdown panel, burger, mobile drawer, breadcrumb.
   Sources: styles.css 621-1073, stranded base rules 3614-3626 (mobile-meta
   hide + burger scroll-lock, formerly after the login-page section), mobile
   drawer rules 3687-3791 + 3794-3868 (from the former RESPONSIVE block).
   DS counterparts: navigations/main-navigation.postcss,
   sections/desktop-menu.postcss, sections/mobile-menu.postcss,
   components/burger.postcss, sections/breadcrumb.postcss.`,
    chunks: [
      { s: 621, e: 1073 },
      // 3614-3626 sat stranded after the login-page rules in the monolith:
      // the .main-navigation__mobile-meta base hide + the burger scroll-lock.
      // They must stay BEFORE the media-wrapped mobile rules below — in the
      // first split the base hide landed in secondary-pages.css (imported
      // later), which flipped the cascade and hid the drawer meta links.
      { s: 3614, e: 3626 },
      { s: 3687, e: 3791, wrap: '@media (max-width: 1023.98px)' },
      { s: 3794, e: 3868, wrap: '@media (max-width: 1023.98px)' },
    ],
  },
  {
    file: 'components/buttons.css',
    header: `Buttons: .btn variants, back-to-top, share-bar (back / print / share).
   Sources: styles.css 1103-1206, 2782-2863, 3026-3095.
   DS counterparts: components/btn.postcss, components/back-to-top-btn.postcss,
   components/share-bar.postcss.`,
    chunks: [
      { s: 1103, e: 1206 },
      { s: 2782, e: 2863 },
      { s: 3026, e: 3095 },
    ],
  },
  {
    file: 'components/cards.css',
    header: `Cards: base card, quick-card, profile card, arrow button.
   Sources: styles.css 1207-1458.
   DS counterpart: components/card.postcss.`,
    chunks: [{ s: 1207, e: 1458 }],
  },
  {
    file: 'foundations/typography.css',
    header: `Heading utilities (.h1-.h5), caption, section heading/intro, meta-info.
   Sources: styles.css 1459-1569.
   DS counterparts: foundations/typography.postcss, components/meta-info.postcss.`,
    chunks: [{ s: 1459, e: 1569 }],
  },
  {
    file: 'components/status.css',
    header: `Status system: badges, status pipeline, wizard step indicator.
   Sources: styles.css 1570-1797, pipeline mobile override 3878.
   DS counterparts: components/badge.postcss, components/steps.postcss,
   components/step-indicator.postcss.`,
    chunks: [
      { s: 1570, e: 1797 },
      { s: 3878, e: 3878, wrap: '@media (max-width: 480px)' },
    ],
  },
  {
    file: 'components/forms.css',
    header: `Form fields, inputs, selects, combobox, search field, DS form
   aliases, option groups (radio/checkbox).
   Sources: styles.css 1798-2149.
   DS counterparts: components/form.postcss, components/input.postcss,
   components/select.postcss, components/search.postcss.`,
    chunks: [{ s: 1798, e: 2149 }],
  },
  {
    file: 'components/feedback.css',
    header: `Transient + overlay surfaces: notifications, notification banner,
   prototype notice, modal, toast, keyboard-shortcut overlay, role-switch
   button (modal content), batch-approve modal fields.
   Sources: styles.css 2150-2356, 2642-2771, 3275-3308, 3564-3584,
   4735-4746, shortcut-grid mobile override 3873.
   DS counterparts: components/notification.postcss,
   components/notification-banner.postcss, components/modal.postcss,
   components/toast-message.postcss.`,
    chunks: [
      { s: 2150, e: 2356 },
      { s: 2642, e: 2771 },
      { s: 3275, e: 3308 },
      { s: 3873, e: 3873, wrap: '@media (max-width: 768px)' },
      { s: 3564, e: 3584 },
      { s: 4735, e: 4746 },
    ],
  },
  {
    file: 'components/tables.css',
    header: `Data tables + list-page furniture: table, documents filter bar,
   active filter pills, pagination, page header (H1 + side actions on the
   list/detail pages), filter row + filter chips (tag-item).
   Sources: styles.css 2357-2641, 3388-3418, 3490-3549.
   Cascade note: .page-header__title overrides the .h1 margin — this file
   must import after foundations/typography.css.
   DS counterparts: components/table.postcss, components/pagination.postcss,
   components/tag-item.postcss, components/badge-filter.postcss.`,
    chunks: [
      { s: 2357, e: 2641 },
      { s: 3388, e: 3418 },
      { s: 3490, e: 3549 },
    ],
  },
  {
    file: 'sections/footer.css',
    header: `Footer (three-column information grid + bottom strip).
   Sources: styles.css 2772-2781, 2864-3025.
   DS counterpart: sections/footer.postcss.`,
    chunks: [
      { s: 2772, e: 2781 },
      { s: 2864, e: 3025 },
    ],
  },
  {
    file: 'sections/secondary-pages.css',
    header: `Secondary pages: search hero + results + no-results, empty state,
   login page, app-detail helpers, downloads page, profile page,
   service stubs.
   Sources: styles.css 3096-3274, 3550-3562, 3585-3612, 4626-4734,
   4747-4765.`,
    chunks: [
      { s: 3096, e: 3274 },
      { s: 3550, e: 3562 },
      { s: 3585, e: 3612 },
      { s: 4626, e: 4734 },
      { s: 4747, e: 4765 },
    ],
  },
  {
    file: 'components/disclosure.css',
    header: `Disclosure components: accordion, application-detail tabs.
   Sources: styles.css 3309-3387, 5092-5154.
   DS counterparts: components/accordion.postcss, components/tab.postcss.`,
    chunks: [
      { s: 3309, e: 3387 },
      { s: 5092, e: 5154 },
    ],
  },
  {
    file: 'sections/home.css',
    header: `Landing + authenticated home: split hero, explainer video,
   greeting strip, home hero + CTA, service list, open-items band.
   Sources: styles.css 3889-3919, 4253-4423, 4466-4625.`,
    chunks: [
      { s: 3889, e: 3919 },
      { s: 4253, e: 4423 },
      { s: 4466, e: 4625 },
    ],
  },
  {
    file: 'sections/info.css',
    header: `Info page (Arbeitsinstrumente): page header, page-with-TOC layout,
   sticky TOC scroll-spy, link lists, contact section.
   Sources: styles.css 3920-4252.
   DS counterparts: layouts/sticky.postcss, components/menu.postcss.`,
    chunks: [{ s: 3920, e: 4252 }],
  },
  {
    file: 'sections/wizard.css',
    header: `Five-step demand wizard: layout, step content, calculation block,
   NAW confidence panel, auto-save, validation summary (step 5).
   Sources: styles.css 3432-3489, 4836-5033.`,
    chunks: [
      { s: 3432, e: 3489 },
      { s: 4836, e: 5033 },
    ],
  },
  {
    file: 'sections/review.css',
    header: `Reviewer surfaces: queue bulk-action toolbar, reviewer split-pane,
   history timeline, queue table tweaks, Auflagen list.
   Sources: styles.css 3419-3431, 5034-5091, 5155-5259.`,
    chunks: [
      { s: 3419, e: 3431 },
      { s: 5034, e: 5091 },
      { s: 5155, e: 5259 },
    ],
  },
  {
    file: 'sections/news.css',
    header: `News surfaces: news list page, news detail article, news carousel
   section, news-overview list.
   Sources: styles.css 4766-4835, 5260-5436.
   DS counterparts: components/carousel.postcss, components/card.postcss.`,
    chunks: [
      { s: 4766, e: 4835 },
      { s: 5260, e: 5436 },
    ],
  },
  {
    file: 'sections/properties.css',
    header: `Property portfolio: gallery/list/map views, view toggle, markers,
   map popups, portfolio stats band, floor detail (interactive floor plan).
   Sources: styles.css 4424-4465, 5437-5773, 6786-7029.`,
    chunks: [
      { s: 4424, e: 4465 },
      { s: 5437, e: 5773 },
      { s: 6786, e: 7029 },
    ],
  },
  {
    file: 'sections/media-viewer.css',
    header: `Document viewer + image gallery (lightbox pair): document templates,
   zoom toolbar, comments rail, share popover, side-nav chevrons, gallery.
   Sources: styles.css 5774-6299.`,
    chunks: [{ s: 5774, e: 6299 }],
  },
  {
    file: 'sections/property-detail.css',
    header: `Property detail page: header strip, tenancy block, floor list,
   related applications, contacts.
   Sources: styles.css 6300-6785.`,
    chunks: [{ s: 6300, e: 6785 }],
  },
  {
    file: 'foundations/print.css',
    header: `Print rules: global chrome suppression + floor-plan print layout.
   Imported last (mirrors DS main.postcss importing print.postcss last).
   Sources: styles.css 3881-3886, 7030-7048.
   DS counterpart: print.postcss.`,
    chunks: [
      { s: 3881, e: 3886 },
      { s: 7030, e: 7048 },
    ],
  },
];

// ── Audit: every styles.css line must land in exactly one file ──────────
// Exceptions: 1-29 (monolith header comment, superseded by main.css),
// 3628-3633 + 3869-3870 + 3874-3875 + 3879-3880 + 3888 (banner comments and
// braces of the dissolved RESPONSIVE block), 3887 (app-half banner).
const claimed = new Array(src.length + 1).fill(0);
for (const f of FILES) {
  for (const c of f.chunks || []) {
    for (let i = c.s; i <= c.e; i++) claimed[i]++;
  }
}
const allowedUnclaimed = new Set();
for (let i = 1; i <= 29; i++) allowedUnclaimed.add(i);
[3628, 3629, 3630, 3631, 3632, 3633, 3869, 3870, 3874, 3875, 3879, 3880, 3887, 3888].forEach(n => allowedUnclaimed.add(n));
const problems = [];
for (let i = 1; i <= src.length; i++) {
  if (claimed[i] === 0 && !allowedUnclaimed.has(i) && src[i - 1].trim() !== '') {
    problems.push(`line ${i} unclaimed: ${src[i - 1].slice(0, 80)}`);
  }
  if (claimed[i] > 1) problems.push(`line ${i} claimed ${claimed[i]}x`);
}
if (problems.length) {
  console.error(`AUDIT FAILED (${problems.length}):`);
  problems.slice(0, 50).forEach(p => console.error('  ' + p));
  process.exit(1);
}

// ── Emit files ──────────────────────────────────────────────────────────
const fixUrls = (line) => line
  .replace(/url\('\.\.\/assets\//g, "url('../../assets/")
  .replace(/url\("\.\.\/assets\//g, 'url("../../assets/');

for (const f of FILES) {
  const out = [];
  if (f.file === 'foundations/tokens.css') {
    out.push(fixUrls(tokensSrc));
  } else {
    out.push(`/* ==========================================================================`);
    out.push(`   ${f.file} — BBL Mieterportal`);
    out.push('');
    out.push(`   ${f.header}`);
    out.push(`   ========================================================================== */`);
    for (const c of f.chunks) {
      out.push('');
      const body = [];
      for (let i = c.s; i <= c.e; i++) body.push(fixUrls(src[i - 1]));
      // Trim leading/trailing blank lines inside the chunk.
      while (body.length && body[0].trim() === '') body.shift();
      while (body.length && body[body.length - 1].trim() === '') body.pop();
      if (c.wrap) {
        out.push(`${c.wrap} {`);
        for (const l of body) out.push(l);
        out.push('}');
      } else {
        for (const l of body) out.push(l);
      }
    }
    out.push('');
  }
  const target = join('css', f.file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, out.join('\n'));
  console.log(`wrote css/${f.file}`);
}

// ── main.css ────────────────────────────────────────────────────────────
const order = FILES.filter(f => f.file !== 'foundations/print.css').map(f => f.file);
order.push('foundations/print.css');
const main = `/* ==========================================================================
   MAIN.CSS — BBL Mieterportal, single stylesheet entry point.

   Structure mirrors the Swiss Confederation design system
   (github.com/swiss/designsystem, reviewed at v1.0.45):
     foundations/   tokens (single source of truth), typography, print
     layouts/       page scaffold, generic layout objects
     navigations/   federal chrome: header bars, navigation, breadcrumb
     components/    pattern families reused across views
     sections/      per-surface styles (home, wizard, review, properties, …)

   NAMING — two namespaces share these files:
     - Design-system component classes keep the DS's own class names
       (.btn, .card, .badge, .accordion, .tag-item, …) so diffs against
       designsystem/css/** stay trivial.
     - App-specific classes use their surface's block name
       (.wizard-*, .queue-*, .docviewer-*, .property-*, …).

   IMPORT ORDER — cascade-preserving, not taxonomic: the files below are
   ordered by where their rules sat in the pre-split monolith
   (css/styles.css, see each file's Sources header), so the cascade is
   bit-identical to the pre-split rendering. Verified by
   scripts/review/diff-baseline.mjs (computed-style hash diff over every
   route × viewport). Do not reorder imports without re-running that check.
   ========================================================================== */
${order.map(f => `@import url('${f}');`).join('\n')}
`;
writeFileSync(join('css', 'main.css'), main);
console.log('wrote css/main.css');
console.log(`${FILES.length + 1} files emitted.`);
