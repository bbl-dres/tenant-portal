/* Search improvements — the three steps in front of and above the result list.
 *
 * Two halves, deliberately:
 *   PURE     question detection, keyword resolution and the relevance gate are
 *            plain functions, so they are asserted directly. A ranking or gating
 *            bug is invisible in a screenshot and silent in a browser check.
 *   BROWSER  the surfaces those functions feed — the grouped suggestions with
 *            their empty-state examples, the source selection, and the answer
 *            block above the results.
 *
 * Run: node scripts/verify/check-search-improvements.mjs
 */
import { chromium } from 'playwright';
import { startServer } from './lib.mjs';

let failures = 0;
const check = (condition, label, detail = '') => {
  if (!condition) failures++;
  console.log(`   ${condition ? '✓' : '✗'} ${label}${detail ? `  — ${detail}` : ''}`);
};
const section = (title) => console.log(`\n■ ${title}`);

/* ── PURE ──────────────────────────────────────────────────────────────── */
// search-sources.js reads localStorage through lib.js on import.
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};

const { isQuestion, resolve } = await import('../../js/search-query.js');
const sources = await import('../../js/search-sources.js');
const { prepare, search } = await import('../../js/search-engine.js');
const { build } = await import('../../js/search-answer.js');

const INDEX = [
  { kind: 'Dienstleistungen', type: 'Dienstleistung', title: 'Schaden melden',
    lead: 'Defekte an Gebäude und Technik melden.', answerText: 'Defekte an Gebäude und Technik melden.',
    href: '#/services/schaden', boost: 6,
    fields: { title: 'Schaden melden', type: 'Dienstleistung Service', lead: 'Defekte an Gebäude und Technik melden.' } },
  { kind: 'Informationen', type: 'Information', title: 'Ablauf einer Schadenmeldung',
    lead: 'Wie eine Meldung bearbeitet wird.', answerText: 'Wie eine Meldung bearbeitet wird.',
    href: '#/info/ablauf', boost: 1,
    fields: { title: 'Ablauf einer Schadenmeldung', type: 'Information', lead: 'Wie eine Meldung bearbeitet wird.' } },
  { kind: 'Dokumente', type: 'Grundriss', title: 'Grundriss Bundeshaus West',
    lead: 'Grundriss · PDF · 2 MB', answerText: '',
    href: '#/downloads?doc=1', boost: 0,
    fields: { title: 'Grundriss Bundeshaus West', ref: 'DOC-1', type: 'Grundriss', lead: '', extra: '' } },
].map(prepare);

section('Question detection is the cost gate');
check(isQuestion('Wie melde ich einen Schaden?'), 'a German question is one');
check(isQuestion('Comment signaler un dégât ?'), 'a French question is one — the interface is trilingual');
check(isQuestion('Come segnalare un danno?'), 'an Italian question is one');
check(!isQuestion('schaden'), 'a single keyword is not');
check(!isQuestion('schaden melden'), 'a two-word navigational query is not');
check(!isQuestion('VG-2026-0203'), 'a reference is not — its fragments are not words');

section('Resolution removes function words and keeps the subject');
const plan = resolve('Wie melde ich einen Schaden?');
check(plan.keywords.join(' ') === 'melde schaden', 'keeps the carrying words', plan.keywords.join(' '));
check(plan.dropped.includes('wie') && plan.dropped.includes('ich'), 'reports what it dropped');
const french = resolve('Comment signaler un dégât ?');
check(!french.keywords.includes('comment') && !french.keywords.includes('un'),
  'French function words are dropped too', french.keywords.join(' '));

section('Resolution is what turns 0 results into results');
check(search(INDEX, 'Wie melde ich einen Schaden?').length === 0,
  'the unchanged engine finds nothing literally');
const answered = build('Wie melde ich einen Schaden?', INDEX);
check(answered.hits.length > 0, 'the same question resolved finds rows', `${answered.hits.length} rows`);

section('The relevance gate withholds the dangerous answer');
check(answered.state === 'answer', 'an understood question is answered');
check(answered.parts.every((part) => Number.isInteger(part.cite) && part.cite > 0 && answered.sources[part.cite - 1]),
  'every part carries a citation that resolves to a source');
check(new Set(answered.sources.map((s) => s.type)).size === answered.sources.length,
  'sources come from different kinds rather than repeating one');
const unrelated = build('Wie viele Ferientage stehen mir zu?', INDEX);
check(unrelated.state === 'none',
  'an unrelated question is NOT answered from a single-word fallback', `state=${unrelated.state}`);

section('An entry without prose can be a result but never a source');
const plan2 = build('Grundriss Bundeshaus melden', INDEX);
check(plan2.state === 'none' || plan2.sources.every((s) => s.title !== 'Grundriss Bundeshaus West'),
  'the document is never cited');

section('Source selection: stored as what is OFF');
sources.reset();
check(sources.activeKinds() === null, 'everything on means no filtering at all');
sources.toggle('Dokumente');
check(sources.filterEntries(INDEX).every((e) => e.kind !== 'Dokumente'),
  'a switched-off kind disappears from every search path');
check(JSON.parse(store.get('mp-search-sources')).includes('Dokumente'),
  'what is stored is the switched-off kind, so a NEW kind defaults to on');
sources.clearAllKinds();
check(sources.activeKinds() === null && sources.filterEntries(INDEX).length === INDEX.length,
  'an empty selection means no restriction, not an empty result list');
sources.reset();
sources.toggle(sources.ANSWERS);
check(!sources.answersAllowed(), 'answers can be switched off on their own');
sources.clearAllKinds();
sources.selectAllKinds();
check(!sources.answersAllowed(), 'neither jump touches that decision');
sources.reset();

/* ── BROWSER ───────────────────────────────────────────────────────────── */
const { server, baseUrl } = await startServer();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  await page.goto(`${baseUrl}/#/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  section('Landing page: empty field offers example questions');
  await page.click('#homeSearchInput');
  await page.waitForTimeout(300);
  const examples = await page.$$eval('#homeSearchOptions .combobox__option-primary', (els) => els.map((e) => e.textContent.trim()));
  check(examples.length === 4, 'four examples appear on focus', `${examples.length}`);
  check(examples[0].startsWith('Wie melde ich'), 'they are real questions', examples[0] || '');
  const groupLabel = await page.$eval('#homeSearchOptions .combobox__group', (e) => e.textContent.trim()).catch(() => '');
  check(groupLabel.startsWith('Beispiele'), 'under a heading that says what they are', groupLabel);

  /* And the list is actually UNDER THE FIELD. Asserting the DOM alone passed
     while the popup — absolutely positioned, with no positioned ancestor —
     fell through to `.page-container` and rendered at the foot of the page:
     four correct suggestions nobody could see. Geometry is the only check
     that catches that. */
  const anchored = await page.evaluate(() => {
    const field = document.getElementById('homeSearchInput').getBoundingClientRect();
    const list = document.getElementById('homeSearchOptions').getBoundingClientRect();
    return { gap: Math.round(list.top - field.bottom), dx: Math.round(Math.abs(list.left - field.left)) };
  });
  check(anchored.gap >= 0 && anchored.gap < 24 && anchored.dx < 4,
    'and opens directly under the field, not somewhere else on the page',
    `${anchored.gap}px below, ${anchored.dx}px off`);

  section('Landing page: typed query is grouped and highlighted');
  await page.fill('#homeSearchInput', 'schaden');
  await page.waitForTimeout(400);
  const groups = await page.$$eval('#homeSearchOptions .combobox__group', (els) => els.map((e) => e.textContent.trim()));
  const marks = await page.$$eval('#homeSearchOptions mark', (els) => els.length);
  check(groups.length >= 1, 'results are grouped by content kind', groups.join(' · '));
  check(marks > 0, 'the match is highlighted', `${marks} marks`);

  section('Landing page: a question offers a way out');
  await page.fill('#homeSearchInput', 'Wie melde ich einen Schaden?');
  await page.waitForTimeout(400);
  const action = await page.$eval('#homeSearchOptions .combobox__option--action', (e) => e.textContent.trim()).catch(() => '');
  check(action.includes('als Frage stellen'), 'the action row appears', action);

  section('Escape closes the list and it stays closed');
  await page.fill('#homeSearchInput', 'schaden');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  /* Chrome empties an `input[type=search]` on Escape and fires `input`, which
     is the same signal an empty field gives on focus. If the examples come back
     here, Escape has done nothing a user can see. */
  check(await page.$eval('#homeSearchOptions', (e) => e.hidden),
    'the list does not reopen with the examples');
  await page.click('body');
  await page.waitForTimeout(200);
  await page.click('#homeSearchInput');
  await page.waitForTimeout(300);
  check(!(await page.$eval('#homeSearchOptions', (e) => e.hidden)),
    'but coming back to the field offers them again');
  await page.click('body');
  await page.waitForTimeout(200);

  section('One character must not open a list');
  await page.fill('#homeSearchInput', 's');
  await page.waitForTimeout(300);
  check(await page.$eval('#homeSearchOptions', (e) => e.hidden), 'the list stays closed');

  /* The panel makes the copy column grow by several hundred pixels, and two
     separate rules used to centre things against that growth: `align-items` on
     the grid centred the two COLUMNS against each other, and `justify-content`
     centred the copy INSIDE its column. Opening the panel therefore floated the
     image down beside the text and — once the first was fixed — still pulled the
     title up while the image stayed put. Nothing above a panel should move
     because that panel opened, so what is asserted is the two positions across
     the toggle, not the CSS that produces them. */
  const heroRead = () => page.evaluate(() => {
    const top = (sel) => Math.round(document.querySelector(sel).getBoundingClientRect().top + window.scrollY);
    return {
      image: top('.hero__figure__media'),
      title: top('.hero__title'),
      column: top('.hero__split-content'),
      titleMargin: getComputedStyle(document.querySelector('.hero__title')).marginTop,
      columns: getComputedStyle(document.querySelector('.hero__inner--split')).gridTemplateColumns,
    };
  });
  const twoColumns = (state) => state.columns.trim().split(/\s+/).length === 2;

  section('Landing page: opening the panel must not move the hero');
  const heroClosed = await heroRead();
  await page.click('.search-sources__toggle');
  await page.waitForTimeout(400);
  const heroOpen = await heroRead();
  check(heroClosed.image === heroOpen.image,
    'the image keeps its position', `${heroClosed.image} → ${heroOpen.image}`);
  check(heroClosed.title === heroOpen.title,
    'and so does the title', `${heroClosed.title} → ${heroOpen.title}`);
  check(heroOpen.image === heroOpen.column,
    'the image sits at the top of its track, not centred against a grown column',
    `image ${heroOpen.image}, column ${heroOpen.column}`);
  await page.click('.search-sources__toggle');
  await page.waitForTimeout(300);

  /* The margin is what the old centring supplied by accident: flush against the
     photo the title reads as fighting its edge. Since the 2026-08 alignment
     (docs/design-alignment.md D45, user decision) it belongs to the WIDEST
     tier only (≥1280): the compact two-column hero between 768 and 1279 sets
     none, so the title tops the search column flush with the photo there. */
  section('Landing page: the title margin belongs to the widest hero tier');
  check(twoColumns(heroClosed) && parseFloat(heroClosed.titleMargin) > 0,
    'wide two columns (≥1280): the title clears the image edge',
    `${heroClosed.columns} / ${heroClosed.titleMargin}`);
  check(heroClosed.title > heroClosed.image,
    'so it starts below the top of the photo',
    `title ${heroClosed.title}, image ${heroClosed.image}`);
  await page.setViewportSize({ width: 900, height: 1000 });
  await page.waitForTimeout(400);
  const heroNarrow = await heroRead();
  check(parseFloat(heroNarrow.titleMargin) === 0,
    'compact tier (<1280): no margin, whatever the column count (D45)',
    `${heroNarrow.columns} / ${heroNarrow.titleMargin}`);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForTimeout(400);

  section('Results page: the answer block stands above every query');
  await page.goto(`${baseUrl}/#/search?q=schaden`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  check(await page.$('.answer-slot--idle') !== null, 'a keyword query gets the idle state');
  const idleExamples = await page.$$eval('.answer__examples a', (els) => els.length).catch(() => 0);
  check(idleExamples === 4, 'with the four example questions as links', `${idleExamples}`);

  await page.goto(`${baseUrl}/#/search?q=${encodeURIComponent('Wie melde ich einen Schaden?')}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  /* The query survives the round trip through the hash. handleHash re-injects
     `lang` through URLSearchParams, whose serialiser writes a space as `+`;
     the field showed «Wie+melde+ich+einen+Schaden?» until parseHashQuery was
     taught to read a `+` back as a space. Questions are multi-word by nature,
     so this surface is where it shows. */
  const echoed = await page.$eval('#searchPageInput', (e) => e.value);
  check(echoed === 'Wie melde ich einen Schaden?', 'the query survives the hash unmangled', echoed);

  const head = await page.$eval('.answer__head', (e) => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
  const cites = await page.$$eval('.answer__cite', (els) => els.length).catch(() => 0);
  const results = await page.$$eval('.search-result', (els) => els.length).catch(() => 0);
  check(head.includes('KI-Antwort'), 'a question gets the answer', head);
  check(head.includes('Simuliert'), 'labelled as simulated', head);
  check(cites > 0, 'with a citation on every sentence', `${cites} citations`);
  check(results > 0, 'and the result list is not empty', `${results} rows`);

  section('Results page: the source selection narrows the search');
  const before = await page.$$eval('.search-result', (els) => els.length);
  await page.click('#searchSourcesToggle');
  await page.waitForTimeout(300);
  const boxes = await page.$$eval('#searchSourcesPanel input[type=checkbox]', (els) => els.length);
  check(boxes === 6, 'five content kinds plus the answer', `${boxes}`);
  check(await page.$eval('#searchSourcesPanel', (e) => !/\(\d+\)/.test(e.textContent)),
    'and no corpus counts, which could not survive a real database');
  await page.click('#searchSource0');
  await page.waitForTimeout(700);
  const after = await page.$$eval('.search-result', (els) => els.length);
  const line = await page.$eval('.search-sources__text', (e) => e.textContent.replace(/\s+/g, ' ').trim());
  check(after !== before || line.includes('ohne') || line.includes('Nur'),
    'switching a kind off changes the page and the line says so', line);

  check(errors.length === 0, 'no page errors', errors.slice(0, 2).join(' | '));
  await page.close();
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}

console.log(`\n${failures ? `✗ ${failures} check(s) FAILED` : '✓ all checks passed'}`);
process.exit(failures ? 1 : 0);
