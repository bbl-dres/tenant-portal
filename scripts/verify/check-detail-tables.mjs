/* Detail-view tables — every one carries the catalogue bar and paginates.
 *
 * The four tables on a property (Verträge, Geschosse, Dokumente, Vorgänge)
 * used to render every row in one fixed order with no way to search them. They
 * now go through js/data-table.js, which is the same arrangement the catalogue
 * pages and the sister service-portal's detail tabs use. What is asserted here
 * is that the four surfaces stayed the SAME surface — a table that quietly
 * loses its bar or its footer on one tab is exactly the drift this replaced.
 *
 * Run: node scripts/verify/check-detail-tables.mjs
 */
import { chromium } from 'playwright';
import { startServer } from './lib.mjs';

let failures = 0;
const check = (condition, label, detail = '') => {
  if (!condition) failures++;
  console.log(`   ${condition ? '✓' : '✗'} ${label}${detail ? `  — ${detail}` : ''}`);
};
const section = (title) => console.log(`\n■ ${title}`);

const PROPERTY = 'T-2012-AA-01';
const TABS = [
  { key: 'vertraege', unit: 'Verträge' },
  { key: 'geschosse', unit: 'Geschosse' },
  { key: 'dokumente', unit: 'Dokumente' },
  { key: 'vorgaenge', unit: 'Vorgänge' },
];

const { server, baseUrl } = await startServer();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  await page.goto(`${baseUrl}/#/properties/${PROPERTY}?tab=dokumente`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);

  const read = () => page.evaluate(() => {
    const panel = document.getElementById('detailTab');
    const text = (sel) => panel.querySelector(sel)?.textContent.replace(/\s+/g, ' ').trim() || '';
    return {
      bar: !!panel.querySelector('.catbar'),
      search: !!panel.querySelector('.catbar__search input[type=search]'),
      sorts: [...panel.querySelectorAll('.catbar__sort option')].length,
      filter: !!panel.querySelector('.catbar__filter'),
      facets: panel.querySelectorAll('.catbar__panel input[data-facet]').length,
      panelHidden: panel.querySelector('.catbar__panel')?.hidden,
      count: text('.catbar__count'),
      pagination: !!panel.querySelector('.pagination'),
      pageCount: text('.pagination__count'),
      rows: panel.querySelectorAll('tbody tr').length,
      headers: [...panel.querySelectorAll('thead th')].map((th) => th.textContent.trim()),
    };
  });

  section('Every tab with a table has the same bar and the same footer');
  for (const tab of TABS) {
    await page.click(`#tab-${tab.key}`);
    await page.waitForTimeout(450);
    const state = await read();
    /* Read as one line per tab: a tab that loses any one of these is the
       regression, and naming the tab in the detail says which. */
    check(state.bar && state.search && state.sorts > 1 && state.pagination,
      `${tab.unit}: bar, search, sort, pagination`,
      `bar=${state.bar} search=${state.search} sorts=${state.sorts} pag=${state.pagination}`);
    /* A Filter control is only honest where a facet has values: a property with
       no Vorgänge has no statuses to filter by, and a button opening an empty
       drawer is worse than no button. */
    check(state.filter ? state.facets > 0 : state.facets === 0,
      `${tab.unit}: a Filter control only where there is something to filter`,
      `filter=${state.filter}, ${state.facets} options`);
    check(!state.filter || state.panelHidden === true, `${tab.unit}: and the panel starts closed`);
    check(state.headers.length >= 4, `${tab.unit}: the table keeps its columns`, state.headers.join(' · '));
  }

  section('Übersicht is not a table and gets no bar');
  await page.click('#tab-uebersicht');
  await page.waitForTimeout(400);
  check(!(await read()).bar, 'no catalogue bar over a field/value sheet');

  section('Dokumente: the tab IS the complete list');
  await page.click('#tab-dokumente');
  await page.waitForTimeout(450);
  const docs = await read();
  /* The removed «Alle Dokumente dieser Liegenschaft» link pointed at
     `#/downloads?building=…`, which filters by BUILDING only — while this tab
     also carries the documents linked to the TENANCY. It led out of a complete
     list into a narrower one. */
  check(!(await page.$('.property-docs__more')), 'no link out to a narrower list');
  const linked = await page.evaluate((id) => {
    const tenancy = window.portal.state.tenancies.find((t) => t.id === id);
    return window.portal.state.documents.filter((d) => (d.linkedTo || []).some((l) =>
      (l.entityType === 'Building' && l.entityId === tenancy.buildingId)
      || (l.entityType === 'Tenancy' && l.entityId === tenancy.id))).length;
  }, PROPERTY);
  check(docs.count.startsWith(String(linked)),
    'and states the full linked count', `${docs.count} (${linked} linked)`);

  section('Pagination is real, not decoration');
  check(docs.rows <= 10, 'a page holds at most ten rows', `${docs.rows} rows`);
  check(/1–10 von \d+ Dokumenten/.test(docs.pageCount), 'the footer names the window', docs.pageCount);
  await page.click('#detailTab .pagination button[data-step="1"]');
  await page.waitForTimeout(350);
  const second = await read();
  check(second.pageCount !== docs.pageCount, 'the next-page control moves the window', second.pageCount);

  section('Search narrows the table and says so');
  await page.fill('#detailTab .catbar__search input[type=search]', 'grundriss');
  await page.waitForTimeout(400);
  const searched = await read();
  check(searched.rows < linked && searched.rows > 0, 'fewer rows', `${searched.rows} of ${linked}`);
  check(/von \d+ Dokumenten/.test(searched.count), 'the count states what was removed', searched.count);
  /* Redrawing the table must not replace the field being typed into. */
  const focused = await page.evaluate(() => document.activeElement?.type === 'search');
  check(focused, 'and the search field keeps focus across the redraw');

  section('A facet narrows it too, and the badge shows how many are on');
  await page.fill('#detailTab .catbar__search input[type=search]', '');
  await page.waitForTimeout(300);
  await page.click('#detailTab .catbar__filter');
  await page.waitForTimeout(250);
  await page.click('#detailTab .catbar__panel input[data-facet]');
  await page.waitForTimeout(350);
  const faceted = await read();
  check(faceted.rows < linked, 'the facet removes rows', `${faceted.rows} of ${linked}`);
  const badge = await page.$eval('#detailTab .catbar__filter-count', (element) => element.textContent.trim());
  check(badge === '1', 'the filter badge counts it', badge);

  section('Switching tabs re-mounts the table');
  /* The panel is replaced wholesale on a tab switch, so a component inside it
     is gone; without the afterRender hook the next tab showed a bare host. */
  await page.click('#tab-geschosse');
  await page.waitForTimeout(450);
  await page.click('#tab-dokumente');
  await page.waitForTimeout(450);
  const back = await read();
  check(back.bar && back.rows > 0, 'the table is there again', `${back.rows} rows`);
  check(back.count === docs.count, 'and starts unfiltered', back.count);

  check(errors.length === 0, 'no page errors', errors.slice(0, 2).join(' | '));
  await page.close();
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}

console.log(`\n${failures ? `✗ ${failures} check(s) FAILED` : '✓ all checks passed'}`);
process.exit(failures ? 1 : 0);
