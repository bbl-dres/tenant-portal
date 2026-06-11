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
import { startServer, makeReporter } from './lib.mjs';

const outDir = join(process.cwd(), 'verify_out', 'mobile-layouts');
mkdirSync(outDir, { recursive: true });

const VIEWPORTS = [320, 375, 390];
// Deep links auto-login (app.js init), so authenticated routes work directly.
const ROUTES = [
  { label: 'home', hash: '#/home' },
  { label: 'properties', hash: '#/properties' },
  { label: 'property-detail', hash: '#/properties/T-2010-AA-01' },
  { label: 'downloads', hash: '#/downloads' },
  { label: 'repair', hash: '#/repair' },
  { label: 'inbox', hash: '#/inbox' },
];

const { server, baseUrl } = await startServer();
const { check, finish } = makeReporter('check-mobile-layouts');
const browser = await chromium.launch();

try {
  for (const width of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    // Accept consent once so the banner doesn't shift layout measurements,
    // and log in as LBO — same flow as scripts/check-a11y-responsive.mjs.
    // (Deep-link auto-login only runs at page load; subsequent hash
    // navigations on a logged-out session bounce to #/.)
    await page.goto(`${baseUrl}/#/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.portal?.acceptCookieConsent?.('necessary'));
    await page.evaluate(() => window.t3lite.demoRole('LBO'));
    await page.waitForTimeout(350);

    for (const route of ROUTES) {
      await page.goto(`${baseUrl}/${route.hash}?lang=de`);
      await page.waitForSelector('#page-body section, #page-body .section', { timeout: 10000 });
      await page.waitForTimeout(600);

      const res = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const offenders = [];
        for (const el of document.querySelectorAll('#page-body *')) {
          // Elements inside a horizontal scroller are allowed to overflow it.
          if (el.closest('.table-wrapper, .docs-table-wrap, .pipeline')) continue;
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
        const controls = await page.evaluate(() =>
          [...document.querySelectorAll('.docs-filter-bar .input')]
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
} finally {
  await browser.close();
  server.close();
}
finish();
