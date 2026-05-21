// Verify hero__figure now has a CD-style figcaption.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:8000/Documents/GitHub/tenant-portal';
const OUT  = 'c:/Users/DavidRasner/Documents/GitHub/tenant-portal/verify_out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const figcaption = await page.evaluate(() => {
  const el = document.querySelector('.hero__figure figcaption');
  if (!el) return null;
  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return {
    text: el.textContent.trim(),
    fontSize: cs.fontSize,
    color: cs.color,
    paddingTop: cs.paddingTop,
    lineHeight: cs.lineHeight,
    visible: rect.height > 0 && rect.width > 0,
  };
});
console.log('=== hero__figure figcaption ===');
if (!figcaption) {
  console.log('  ✗ NOT FOUND — figcaption not in DOM');
} else {
  for (const [k, v] of Object.entries(figcaption)) console.log(`  ${k}: ${v}`);
}

const figureBox = await page.locator('.hero__figure').boundingBox();
if (figureBox) {
  await page.screenshot({
    path: `${OUT}/hero_01_with_caption.png`,
    clip: {
      x: Math.max(0, figureBox.x - 16),
      y: Math.max(0, figureBox.y - 16),
      width: figureBox.width + 32,
      height: figureBox.height + 60,  // include caption below
    },
  });
  console.log(`\nscreenshot: ${OUT}/hero_01_with_caption.png`);
}

await browser.close();
