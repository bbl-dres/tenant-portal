// Tight visual on the language switcher — open state, full panel + button.
import { chromium } from 'playwright';

const BASE = 'http://localhost:8000/Documents/GitHub/tenant-portal';
const OUT  = 'c:/Users/DavidRasner/Documents/GitHub/tenant-portal/verify_out';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

// Open dropdown
await page.locator('.top-bar__lang').click();
await page.waitForTimeout(250);

// Take a clipped screenshot covering both button + dropdown
const metrics = await page.evaluate(() => {
  const switcher = document.querySelector('.language-switcher');
  const button = document.querySelector('.top-bar__lang');
  const dropdown = document.querySelector('.language-switcher__dropdown');
  const svg = document.querySelector('.top-bar__lang svg');
  // <use> renders shadow content; path is not queryable. Use SVG bbox.
  const rs = switcher.getBoundingClientRect();
  const rb = button.getBoundingClientRect();
  const rd = dropdown.getBoundingClientRect();
  const rcSvg = svg.getBoundingClientRect();
  return {
    switcherRight: rs.right,
    buttonRight: rb.right,
    dropdownRight: rd.right,
    svgRight: rcSvg.right,
    svgLeft: rcSvg.left,
    svgWidth: rcSvg.width,
    dropdownTop: rd.top,
    dropdownBottom: rd.bottom,
    dropdownLeft: rd.left,
    buttonTop: rb.top,
    deltaDropdownToSvg: rd.right - rcSvg.right,
    // Glyph inside the 24-unit viewBox ends at x=19.42, so right inner
    // whitespace = 4.58/24 ≈ 19% of svg width.
    estimatedGlyphRight: rcSvg.right - (rcSvg.width * (4.58 / 24)),
    estimatedDropdownToGlyph: rd.right - (rcSvg.right - (rcSvg.width * (4.58 / 24))),
  };
});
console.log('METRICS:');
for (const [k, v] of Object.entries(metrics)) console.log(`  ${k}: ${typeof v === 'number' ? v.toFixed(2) : v}`);

const clipX = Math.max(0, metrics.dropdownLeft - 40);
const clipW = Math.min(1440 - clipX, 200);
const clipY = Math.max(0, metrics.buttonTop - 4);
const clipH = (metrics.dropdownBottom - metrics.buttonTop) + 8;

await page.screenshot({
  path: `${OUT}/lang_03_open_tight.png`,
  clip: { x: clipX, y: clipY, width: clipW, height: clipH },
});
console.log(`\nscreenshot: ${OUT}/lang_03_open_tight.png`);
console.log(`  clip: x=${clipX} y=${clipY} w=${clipW} h=${clipH}`);

await browser.close();
