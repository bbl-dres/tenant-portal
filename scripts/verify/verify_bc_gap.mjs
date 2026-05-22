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
await page.goto(`${BASE}/#/properties/T-2010-AA-01`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const metrics = await page.evaluate(() => {
  const icon = document.querySelector('.breadcrumb__dropdown-icon');
  if (!icon) return null;
  const link = icon.previousElementSibling;
  const cs = getComputedStyle(icon);
  const iconRect = icon.getBoundingClientRect();
  const linkRect = link.getBoundingClientRect();
  return {
    iconMarginLeft: cs.marginLeft,
    iconMarginRight: cs.marginRight,
    gap_link_to_icon: iconRect.left - linkRect.right,
    linkText: link.textContent.trim(),
  };
});
console.log('breadcrumb dropdown gap:');
for (const [k, v] of Object.entries(metrics)) console.log(`  ${k}: ${v}`);

const bc = await page.locator('.breadcrumb').boundingBox();
await page.screenshot({
  path: `${OUT}/bc_gap_01.png`,
  clip: { x: Math.max(0, bc.x - 8), y: Math.max(0, bc.y - 8), width: Math.min(800, bc.width + 16), height: bc.height + 16 },
});
console.log(`screenshot: ${OUT}/bc_gap_01.png`);

await browser.close();
