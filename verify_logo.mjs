// Verify split-logo behaviour at 3 viewport widths:
//   - 390 (iPhone 12 Pro): only flag visible, name hidden
//   - 1024 (lg/tablet):    only flag visible, name still hidden
//   - 1440 (xl/desktop):   both flag + name visible
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:8000/Documents/GitHub/tenant-portal';
const OUT  = 'c:/Users/DavidRasner/Documents/GitHub/tenant-portal/verify_out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function check(width, label) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => {
    const flag = document.querySelector('.top-header__bundmark-flag');
    const name = document.querySelector('.top-header__bundmark-name');
    const flagRect = flag.getBoundingClientRect();
    const nameRect = name ? name.getBoundingClientRect() : null;
    return {
      flag: {
        visible: flagRect.width > 0 && flagRect.height > 0,
        width: flagRect.width,
        height: flagRect.height,
        display: getComputedStyle(flag).display,
      },
      name: name ? {
        visible: nameRect.width > 0 && nameRect.height > 0,
        width: nameRect.width,
        height: nameRect.height,
        display: getComputedStyle(name).display,
      } : null,
    };
  });
  console.log(`[${label} @ ${width}px]`);
  console.log(`  flag: ${JSON.stringify(m.flag)}`);
  console.log(`  name: ${JSON.stringify(m.name)}`);

  const header = await page.locator('.top-header').boundingBox();
  await page.screenshot({
    path: `${OUT}/logo_${label}.png`,
    clip: { x: 0, y: 0, width, height: Math.min(180, header.height + 40) },
  });
  await ctx.close();
}

await check(390,  '01_mobile_390');
await check(1024, '02_tablet_1024');
await check(1280, '03_xl_1280');
await check(1440, '04_desktop_1440');

await browser.close();
console.log('\nscreenshots saved to verify_out/logo_*.png');
