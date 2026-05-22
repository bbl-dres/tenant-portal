// Drive the back-to-top button through 3 scroll states (top, mid, bottom)
// on a long-enough page so we can see it float + land.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:8000/Documents/GitHub/tenant-portal';
const OUT  = 'c:/Users/DavidRasner/Documents/GitHub/tenant-portal/verify_out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
await page.evaluate(() => window.t3lite.demoRole('LBO'));
await page.waitForTimeout(800);

// /home is a longer page with multiple sections — good for scroll testing.
await page.goto(`${BASE}/#/home`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

const page_height = await page.evaluate(() => document.documentElement.scrollHeight);
console.log(`page scrollHeight: ${page_height}px`);

async function snap(label, scrollY) {
  await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  await page.waitForTimeout(300);
  const btnInfo = await page.evaluate(() => {
    const btn = document.querySelector('.app-footer__top-btn');
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    return {
      viewportTop: r.top, viewportBottom: r.bottom,
      viewportRight: window.innerWidth - r.right,
      visible: r.top < window.innerHeight && r.bottom > 0,
      width: r.width,
    };
  });
  console.log(`[${label}] scrollY=${scrollY}px  btn=${JSON.stringify(btnInfo)}`);
  await page.screenshot({ path: `${OUT}/back_to_top_${label}.png` });
}

await snap('01_top',    0);
await snap('02_mid',    Math.floor(page_height / 2));
await snap('03_bottom', page_height);

await browser.close();
console.log('\nscreenshots saved to verify_out/back_to_top_*.png');
