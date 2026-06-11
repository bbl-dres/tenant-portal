// Header chrome responsive checks (Playwright).
//
// Consolidates the durable assertions from the retired one-shot scripts
// verify_logo.mjs and verify_mobile_header.mjs:
//   - Split federal logo: below xl only the flag is visible; the
//     wordmark image joins at ≥1280 px.
//   - Breadcrumb: hidden below lg (1024 px), visible on desktop.
//   - Burger: visible below lg, sits in the top-header actions row next
//     to (right of) the search toggle; hidden on desktop.
//   - Navbar row: hidden below lg while the drawer is closed, visible
//     on desktop.
//
// Run: npm run verify:header-chrome
import { chromium } from 'playwright';
import { startServer, makeReporter, run, waitForRoute } from './lib.mjs';

const { server, baseUrl } = await startServer();
const reporter = makeReporter('check-header-chrome');
const { check } = reporter;
const browser = await chromium.launch();

// Expectations per viewport width. `name` = federal wordmark image.
const CASES = [
  { width: 390,  name: false, breadcrumb: false, burger: true,  navbar: false },
  { width: 768,  name: false, breadcrumb: false, burger: true,  navbar: false },
  { width: 1024, name: false, breadcrumb: true,  burger: false, navbar: true },
  { width: 1280, name: true,  breadcrumb: true,  burger: false, navbar: true },
  { width: 1440, name: true,  breadcrumb: true,  burger: false, navbar: true },
];

await run(reporter, async () => {
  for (const c of CASES) {
    const page = await browser.newPage({ viewport: { width: c.width, height: 900 } });
    // Property detail has a breadcrumb; deep link auto-logs-in at load.
    await page.goto(`${baseUrl}/#/properties/T-2010-AA-01?lang=de`);
    await waitForRoute(page, '#/properties/T-2010-AA-01');

    const m = await page.evaluate(() => {
      const vis = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return getComputedStyle(el).display !== 'none' && r.width > 0 && r.height > 0;
      };
      const burger = document.querySelector('.burger');
      const search = document.querySelector('.header-search');
      const b = burger?.getBoundingClientRect();
      const s = search?.getBoundingClientRect();
      return {
        flag: vis('.top-header__bundmark-flag'),
        name: vis('.top-header__bundmark-name'),
        breadcrumb: vis('.breadcrumb'),
        burger: vis('.burger'),
        navbar: vis('.navbar'),
        burgerInActions: !!burger?.closest('.top-header__actions'),
        burgerSameRowAsSearch: b && s ? Math.abs(b.top - s.top) < 10 : null,
        burgerRightOfSearch: b && s ? b.left > s.right - 5 : null,
      };
    });

    check(`@${c.width}: flag always visible`, m.flag === true);
    check(`@${c.width}: wordmark ${c.name ? 'visible' : 'hidden'}`, m.name === c.name);
    check(`@${c.width}: breadcrumb ${c.breadcrumb ? 'visible' : 'hidden'}`, m.breadcrumb === c.breadcrumb);
    check(`@${c.width}: burger ${c.burger ? 'visible' : 'hidden'}`, m.burger === c.burger);
    check(`@${c.width}: navbar ${c.navbar ? 'visible' : 'hidden (drawer closed)'}`, m.navbar === c.navbar);
    if (c.burger) {
      check(`@${c.width}: burger in top-header actions, right of search`,
        m.burgerInActions === true && m.burgerSameRowAsSearch === true && m.burgerRightOfSearch === true,
        JSON.stringify({ inActions: m.burgerInActions, sameRow: m.burgerSameRowAsSearch, rightOf: m.burgerRightOfSearch }));
    }
    await page.close();
  }
}, async () => {
  await browser.close();
  server.close();
});
