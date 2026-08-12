// Mobile layout overflow checks (Playwright).
//
// `.container` uses `overflow-x: clip`, so an overflowing child doesn't
// produce a scrollbar — it gets silently CUT OFF at the right edge. This
// script walks key routes at phone widths and fails when the page (or a
// known-fragile component) extends past the viewport. Also guards the
// #/downloads filter bar against the column-flex-basis-becomes-height
// trap that once rendered each <select> 220+ px tall.
//
// Run: npm run verify:mobile-layouts
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { startServer, makeReporter, loginAs, run, waitForRoute } from './lib.mjs';

const outDir = join(process.cwd(), 'verify_out', 'mobile-layouts');
mkdirSync(outDir, { recursive: true });

const VIEWPORTS = [320, 375, 390];
// Routes default to the LBO (tenant) role; entries with `role` switch the
// demo session first. Keep same-role routes adjacent — switching re-renders.
const ROUTES = [
  { label: 'front', hash: '#/' },   // front page = hero + overview + services (was #/home)
  { label: 'properties', hash: '#/properties' },
  { label: 'property-detail', hash: '#/properties/T-2010-AA-01' },
  { label: 'downloads', hash: '#/downloads' },
  { label: 'repair', hash: '#/repair' },
  { label: 'inbox', hash: '#/inbox' },
  { label: 'queue', hash: '#/queue', role: 'GS-Reviewer' },
  // The TOC aside stacks above the content below 1024 px; the NAW table and
  // the download lists inside it are the widest content in the area.
  { label: 'info-topic', hash: '#/info/ablauf' },
];

const { server, baseUrl } = await startServer();
const reporter = makeReporter('check-mobile-layouts');
const { check } = reporter;
const browser = await chromium.launch();

await run(reporter, async () => {
  for (const width of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    // Consent + login via the shared seam — the banner must not shift
    // layout measurements, and hash navigations on a logged-out session
    // would bounce every authenticated route back to #/.
    await loginAs(page, baseUrl, 'LBO');
    let currentRole = 'LBO';

    for (const route of ROUTES) {
      const role = route.role || 'LBO';
      if (role !== currentRole) {
        await page.evaluate((r) => window.t3lite.demoRole(r), role);
        currentRole = role;
      }
      await page.goto(`${baseUrl}/${route.hash}?lang=de`);
      await waitForRoute(page, route.hash);

      const res = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const offenders = [];
        for (const el of document.querySelectorAll('#page-body *')) {
          // Elements inside a horizontal scroller are allowed to overflow it.
          // `.tabs` is one by design — the DS tab strip scrolls its controls
          // and fades the right edge rather than wrapping them
          // (designsystem css/components/tab.postcss).
          if (el.closest('.table-wrapper, .docs-table-wrap, .pipeline, .tabs')) continue;
          const r = el.getBoundingClientRect();
          if (r.width > 0 && (r.right > vw + 1 || r.left < -1)) {
            offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} [${Math.round(r.left)}..${Math.round(r.right)}]`);
            if (offenders.length >= 5) break;
          }
        }
        return { vw, scrollW: document.documentElement.scrollWidth, offenders };
      });
      check(`${route.label}@${width}: no horizontal overflow`,
        res.scrollW <= res.vw + 1 && res.offenders.length === 0,
        res.offenders.length ? res.offenders.join(', ') : `scrollWidth=${res.scrollW}`);

      if (route.label === 'property-detail') {
        const statsOk = await page.evaluate(() => {
          const vw = document.documentElement.clientWidth;
          const vals = [...document.querySelectorAll('.property-stats__value')];
          return vals.length === 4 && vals.every(v => v.getBoundingClientRect().right <= vw);
        });
        check(`property-detail@${width}: all 4 stat values fully visible`, statsOk);
      }
      if (route.label === 'downloads') {
        // The filters moved into the shared catalogue bar: the search field
        // sits in the row, the two dropdowns in its filter panel. Measure the
        // panel open, since a collapsed panel reports zero-height controls
        // and would pass this check without ever testing them.
        await page.evaluate(() => {
          const panel = document.getElementById('docs-panel');
          const toggle = document.getElementById('docs-filter');
          if (panel) panel.hidden = false;
          if (toggle) toggle.setAttribute('aria-expanded', 'true');
        });
        const controls = await page.evaluate(() =>
          [...document.querySelectorAll('.catbar .input, #docs-panel .input')]
            .map(el => Math.round(el.getBoundingClientRect().height)));
        check(`downloads@${width}: filter controls normal height (≤60 px)`,
          controls.length >= 3 && controls.every(h => h <= 60), controls.join(', '));
      }

      if (width === 375) {
        await page.screenshot({ path: join(outDir, `${route.label}-375.png`), fullPage: true });
      }
    }
    await page.close();
  }
}, async () => {
  await browser.close();
  server.close();
});
