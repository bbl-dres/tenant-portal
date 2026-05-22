// Verify (1) breadcrumb hidden on mobile, (2) burger sits next to search
// in the top-header right side on mobile.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:8000/Documents/GitHub/tenant-portal';
const OUT  = 'c:/Users/DavidRasner/Documents/GitHub/tenant-portal/verify_out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function check(width, height, label) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.t3lite.demoRole('LBO'));
  await page.waitForTimeout(800);
  // go to a page with breadcrumbs (e.g. property detail)
  await page.goto(`${BASE}/#/properties/T-2010-AA-01`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const m = await page.evaluate(() => {
    const bc = document.querySelector('.breadcrumb');
    const burger = document.querySelector('.burger');
    const search = document.querySelector('.header-search');
    const navbar = document.querySelector('.navbar');
    const r = (el) => el ? el.getBoundingClientRect() : null;
    const bcRect = r(bc), burgerRect = r(burger), searchRect = r(search), navbarRect = r(navbar);
    return {
      breadcrumb_visible: bc ? getComputedStyle(bc).display !== 'none' : null,
      navbar_visible:     navbar ? getComputedStyle(navbar).display !== 'none' : null,
      burger_display:     burger ? getComputedStyle(burger).display : null,
      burger_parent_cls:  burger ? burger.parentElement.className : null,
      // Layout: is burger to the RIGHT of search and in the SAME row?
      burger_top:     burgerRect && burgerRect.top,
      search_top:     searchRect && searchRect.top,
      same_row:       (burgerRect && searchRect) ? Math.abs(burgerRect.top - searchRect.top) < 10 : null,
      burger_right_of_search: (burgerRect && searchRect) ? burgerRect.left > searchRect.right - 5 : null,
    };
  });
  console.log(`[${label} @ ${width}x${height}]`);
  console.log(JSON.stringify(m, null, 2));

  await page.screenshot({
    path: `${OUT}/mobile_hdr_${label}.png`,
    clip: { x: 0, y: 0, width, height: Math.min(280, height) },
  });
  await ctx.close();
}

await check(390,  800,  '01_mobile_390');
await check(768,  900,  '02_tablet_768');
await check(1024, 900,  '03_lg_1024');
await check(1440, 900,  '04_desktop_1440');

await browser.close();
console.log('\nscreenshots saved to verify_out/mobile_hdr_*.png');
