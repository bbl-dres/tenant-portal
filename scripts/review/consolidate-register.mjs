// Consolidate Phase C agent findings into the design-review register tables.
//
// Inputs:  <scratch>/findings-raw.json     (broad review: [{agent, findings[]}])
//          <scratch>/sweep-raw.json        (component sweep, optional at first run)
// Output:  <scratch>/register-sections.md  (sections 4 + 5 table markdown)
//          <scratch>/findings-index.json   (register id -> merged finding record)
//
// Dedup happens here, not in the agents: MERGES folds same-root-cause
// findings across agents into one register row (highest priority wins,
// absorbed sources are credited in the comment). IDs are CAT-NNN, assigned
// P1-first then source order, and are STABLE once published — never renumber.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const scratch = process.argv[2];
if (!scratch) {
  console.error('usage: node consolidate-register.mjs <scratchDir>');
  process.exit(2);
}

const broad = JSON.parse(readFileSync(join(scratch, 'findings-raw.json'), 'utf8'));
const sweepPath = join(scratch, 'sweep-raw.json');
const sweep = existsSync(sweepPath) ? JSON.parse(readFileSync(sweepPath, 'utf8')) : null;

// ── Collect: key every finding as agent#N ────────────────────────────────
const byKey = new Map();
for (const a of broad) {
  (a.findings || []).forEach((f, i) => byKey.set(`${a.agent}#${i + 1}`, { ...f, src: `${a.agent}#${i + 1}` }));
}
if (sweep) {
  for (const g of sweep) {
    (g.findings || []).forEach((f, i) => byKey.set(`${g.group}#${i + 1}`, { ...f, src: `${g.group}#${i + 1}` }));
  }
}

// ── Same-root-cause merges (primary <- absorbed) ─────────────────────────
const MERGES = [
  ['tokens#1', 'css-quality#3'],
  ['a11y#1', 'states#2'],
  ['a11y#8', 'states#5'],
  ['a11y#6', 'states#6'],
  ['a11y#7', 'states#7'],
  ['states#1', 'a11y#12'],
  ['a11y#14', 'typography#7'],
  ['a11y#4', 'responsive#7'],
  ['colour#6', 'states#10'],
  ['responsive#9', 'css-quality#9', 'spacing#5'],
  ['colour#8', 'tokens#16'],
  ['colour#18', 'tokens#10'],
  ['tokens#5', 'colour#20'],
  ['colour#3', 'tokens#6'],
  ['cd-formal#3', 'tokens#2'],
  ['css-quality#6', 'css-quality#7', 'typography#8', 'cd-formal#13'],
  ['css-quality#2', 'css-quality#4'],
  ['css-quality#5', 'spacing#9'],
  // Sweep-vs-broad and sweep-vs-sweep duplicates:
  ['forms#1', 'wizard#2'],
  ['buttons-cards#3', 'properties-media#4'],
  ['buttons-cards#5', 'properties-media#7'],
  ['colour#2', 'content#2'],
  ['css-quality#10', 'properties-media#13'],
  ['css-quality#5', 'status-feedback#6', 'properties-media#10'],
];

// The register is an English document (brief §7); a few agents titled their
// findings in German. Normalised here — evidence cells keep original quotes.
const TITLE_OVERRIDES = {
  'a11y#1': 'Clickable table rows without any keyboard operability',
  'a11y#2': 'Page content sits outside the empty main landmark',
  'a11y#3': 'Route changes: static title, focus and context lost',
  'a11y#4': 'Downloads action column squeezed to 8 px — download icon invisible',
  'a11y#5': 'Back-to-top link focusable inside aria-hidden wrapper',
  'a11y#6': 'Collapsed header search: invisible tab stops, focus stranded after Esc',
  'a11y#7': 'Nav dropdown: aria-haspopup="menu" on role="region", focus lost on close',
  'a11y#8': 'Shortcut overlay: aria-modal dialog without focus target or focus move',
  'a11y#9': 'Reviewer mark buttons: aria-pressed never updated',
  'a11y#10': 'Unlabelled form controls: Auflagen checkboxes, file upload, bulk textareas',
  'a11y#11': 'Comboboxes: active option visual-only; wizard variant lacks arrow keys',
  'a11y#13': 'Validation errors only as transient toast, without field reference',
  'a11y#14': 'Heading structure: wizard lacks h1; h1-to-h3 jumps in detail/review',
  'a11y#15': 'Filter pill: ASCII quote truncates aria-label',
  'a11y#16': 'Inbox filter: no announcement; stale pagination line shows wrong count',
  'a11y#17': 'Fact tables: th without scope, missing caption, aria-hidden column header',
  'a11y#18': 'Interactive floor plan mouse-only, no non-visual alternative',
  'a11y#19': 'News dots: role="tablist" without tabs, aria-current misused',
  'a11y#20': 'Breadcrumb dropdown: role="menu" without menu behaviour',
  'a11y#21': 'Accordion triggers without aria-controls or heading wrapper',
  'a11y#22': 'Static content with live-region roles; autosave status never announces',
  'tables#1': 'Table row separators text-200 instead of DS text-300',
  'tables#2': 'Filter chips and pagination one type step below DS text--base',
  'tables#3': 'Pagination shell: 8 px gap instead of 12 px, padding cascade missing',
  'tables#4': 'Page input loses the DS input base: radius, shadow, padding',
  'tables#5': 'Filter chip rebuilt flat: 4 px gap, upper size steps missing',
  'tables#6': 'Download list: subtitle/meta colours and meta spacing drift',
  'tables#7': 'Download icon static 24 px; DS scales 28/32/36',
  'tables#8': 'Unused .table--caps one step below the DS uppercase header',
  'tables#9': 'Disabled pagination chevron dims via opacity instead of DS colours',
};

// Findings the consolidator adds directly (surfaced outside the agent runs).
const INJECTED = [
  {
    category: 'CD', priority: 'P3', verified: true, src: 'consolidator#1',
    title: 'News imagery loads from Unsplash, violating self-contained-imagery invariant',
    affects: 'data/news.json, news cards/list/detail, landing teaser',
    app_evidence: 'data/news.json:10-100 — 10 https://images.unsplash.com/ URLs',
    ds_evidence: 'Repo invariant: scripts/verify/check-property-images.mjs header (all imagery ships with the repo, same-origin)',
    delta: '10 foreign-host images',
    impact: 'News teasers and detail depend on a third-party host; break offline/air-gapped demos',
    fix: 'Bundle local news images (licence check) or swap to local placeholders — sourcing decision needed',
    blast_radius: 'data/news.json + assets/images; no CSS',
    status: 'Needs decision',
  },
];

// Status overrides beyond the default Open.
const STATUS = {
  'colour#13': ['Needs decision', 'DS-vs-WCAG conflict: faithful copy of a DS contrast failure; accessibility beats CD per review mandate — escalated'],
  'consolidator#1': ['Needs decision', 'content sourcing is a product decision'],
};

const PRIO = { P1: 1, P2: 2, P3: 3, P4: 4 };
const absorbed = new Set();
for (const [primary, ...rest] of MERGES) {
  const p = byKey.get(primary);
  if (!p) { console.error('merge primary missing:', primary); continue; }
  for (const key of rest) {
    const s = byKey.get(key);
    if (!s) { console.error('merge source missing:', key); continue; }
    absorbed.add(key);
    if (PRIO[s.priority] < PRIO[p.priority]) p.priority = s.priority;
    p.affects = `${p.affects}; ${s.affects}`.slice(0, 260);
    p.mergedFrom = (p.mergedFrom || []).concat(key);
    p.mergedEvidence = (p.mergedEvidence || []).concat(`${key}: ${String(s.app_evidence).slice(0, 160)}`);
  }
}
for (const f of INJECTED) byKey.set(f.src, f);
for (const [src, title] of Object.entries(TITLE_OVERRIDES)) {
  const f = byKey.get(src);
  if (f) f.title = title;
}

// ── Assign register ids per category ─────────────────────────────────────
const CATS = ['TOK', 'COL', 'TYP', 'SPC', 'RWD', 'CMP', 'STA', 'A11Y', 'CSS', 'CD', 'VER'];
const rows = [...byKey.values()].filter(f => !absorbed.has(f.src));
const perCat = new Map(CATS.map(c => [c, []]));
for (const f of rows) {
  if (!perCat.has(f.category)) perCat.set(f.category, []);
  perCat.get(f.category).push(f);
}
const index = {};
for (const c of CATS) {
  const list = perCat.get(c);
  list.sort((a, b) => PRIO[a.priority] - PRIO[b.priority]);
  list.forEach((f, i) => {
    f.id = `${c}-${String(i + 1).padStart(3, '0')}`;
    index[f.id] = f;
  });
}

// ── Emit markdown ────────────────────────────────────────────────────────
const esc = (s) => String(s || '').replace(/\|/g, '\\|').replace(/\r?\n+/g, ' ').trim();
const clip = (s, n) => { s = esc(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

const CAT_TITLES = {
  TOK: 'Tokens and theming', COL: 'Colour', TYP: 'Typography',
  SPC: 'Spacing, grid and layout', RWD: 'Responsive and mobile', CMP: 'Components',
  STA: 'States and interaction', A11Y: 'Accessibility and semantics',
  CSS: 'CSS quality and naming', CD: 'CD formal elements and editorial', VER: 'Version drift',
};

let md = '';
for (const c of CATS) {
  const list = perCat.get(c);
  md += `### 4.${CATS.indexOf(c) + 1} ${CAT_TITLES[c]} (${c})\n\n`;
  if (!list.length) {
    md += c === 'VER'
      ? 'No findings. No reviewed deviation was traceable to upstream movement between the claimed v1.0.9 and the actual v1.0.45 — deviations were either faithful to both versions or independent of the drift. The stale version claim itself is corrected in the README (see section 7).\n\n'
      : 'No findings in this round.\n\n';
    continue;
  }
  md += `<!-- intro:${c} -->\n\n`;
  md += '| ID | Finding | Affects | Priority | Status | Comment |\n| --- | --- | --- | --- | --- | --- |\n';
  for (const f of list) {
    const [status, reason] = STATUS[f.src] || ['Open', ''];
    const bits = [];
    if (!f.verified) bits.push('UNVERIFIED');
    if (f.dg_documented) bits.push('documented deviation (DESIGNGUIDE §5)');
    bits.push(`App: ${clip(f.app_evidence, 150)}`);
    bits.push(`DS: ${clip(f.ds_evidence, 120)}`);
    if (f.delta) bits.push(`Delta: ${clip(f.delta, 90)}`);
    bits.push(`Fix: ${clip(f.fix, 130)}`);
    if (f.mergedFrom) bits.push(`merged: ${f.mergedFrom.join(', ')}`);
    if (reason) bits.push(reason);
    md += `| ${f.id} | ${clip(f.title, 110)} | ${clip(f.affects, 90)} | ${f.priority} | ${status} | ${bits.map(esc).join('. ')} |\n`;
  }
  md += '\n';
}

// ── Component matrix ─────────────────────────────────────────────────────
if (sweep) {
  const srcToId = {};
  for (const f of Object.values(index)) {
    srcToId[f.src] = f.id;
    for (const m of f.mergedFrom || []) srcToId[m] = f.id;
  }
  md += '## 5. Component matrix\n\n';
  md += '| Component | Desktop | Mobile (360 px) | Open finding IDs | Comparison basis |\n| --- | --- | --- | --- | --- |\n';
  // Attribute a group's NEW findings to the component rows they name:
  // token overlap between the component name and the finding's
  // affects+title (words of 5+ chars). Findings that match no row still
  // live in section 4; the row keeps its verdict either way.
  const tokens = (s) => new Set(String(s).toLowerCase().match(/[a-zäöü-]{5,}/g) || []);
  for (const g of sweep) {
    for (const comp of g.components || []) {
      const ids = (comp.applied_known || '')
        .split(/[,\s]+/).filter(Boolean)
        .map(k => srcToId[k] || k);
      const nameTok = tokens(comp.name);
      const own = (g.findings || [])
        .map((f, i) => ({ f, id: srcToId[`${g.group}#${i + 1}`] }))
        .filter(({ f, id }) => {
          if (!id) return false;
          const ft = tokens(`${f.affects} ${f.title}`);
          for (const t of nameTok) if (ft.has(t)) return true;
          return false;
        })
        .map(({ id }) => id);
      const all = [...new Set([...ids, ...own])];
      md += `| ${esc(comp.name)} | ${comp.desktop_verdict} | ${comp.mobile_verdict} | ${all.join(', ') || '–'} | ${clip(comp.comparison_basis, 110)} |\n`;
    }
  }
  md += '\n';
}

writeFileSync(join(scratch, 'register-sections.md'), md);
writeFileSync(join(scratch, 'findings-index.json'), JSON.stringify(index, null, 1));

const counts = CATS.map(c => `${c}:${perCat.get(c).length}`).join(' ');
const prios = ['P1', 'P2', 'P3', 'P4'].map(p => `${p}:${rows.filter(f => f.priority === p).length}`).join(' ');
console.log(`register rows: ${rows.length} (${counts})`);
console.log(`priorities: ${prios}`);
console.log(`absorbed by merges: ${absorbed.size}`);
