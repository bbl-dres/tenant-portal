// One-shot verification: property pages render local building images, not Unsplash.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = 'http://localhost:8000/Documents/GitHub/tenant-portal';
const OUT  = 'c:/Users/DavidRasner/Documents/GitHub/tenant-portal/verify_out';
mkdirSync(OUT, { recursive: true });

const log = [];
function L(line) { console.log(line); log.push(line); }

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// Capture every image-ish request and its final status.
const imgRequests = [];
page.on('response', async (resp) => {
  const url = resp.url();
  const type = (resp.headers()['content-type'] || '');
  const isImg = /\.(jpe?g|png|webp|gif|svg)(\?|$)/i.test(url) || type.startsWith('image/');
  if (isImg) {
    imgRequests.push({
      url,
      status: resp.status(),
      contentType: type,
      contentLength: resp.headers()['content-length'] || '',
    });
  }
});
page.on('pageerror', (err) => L(`[pageerror] ${err.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error') L(`[console.error] ${msg.text()}`);
});

async function dumpImgs(label) {
  L(`\n--- IMG requests at "${label}" (${imgRequests.length} total so far) ---`);
  for (const r of imgRequests) {
    L(`  ${r.status}  ${r.url}`);
  }
}

async function screenshot(name) {
  const p = `${OUT}/${name}.png`;
  await page.screenshot({ path: p, fullPage: true });
  L(`  screenshot → ${p}`);
}

L('=== STEP 1: Load landing page ===');
await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
const landingTitle = await page.title();
L(`  title: ${landingTitle}`);
await screenshot('01_landing');

L('\n=== STEP 2: Bypass login via demoRole(LBO) ===');
await page.evaluate(() => {
  if (!window.t3lite || !window.t3lite.demoRole) throw new Error('window.t3lite.demoRole missing');
  window.t3lite.demoRole('LBO');
});
await page.waitForTimeout(800);
await page.waitForLoadState('networkidle').catch(()=>{});
L(`  url after demoRole: ${page.url()}`);
await screenshot('02_after_login');

L('\n=== STEP 3: Navigate to #/properties (portfolio) ===');
imgRequests.length = 0; // reset for this view
await page.goto(`${BASE}/#/properties`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.waitForLoadState('networkidle').catch(()=>{});
L(`  url: ${page.url()}`);

// Snapshot the actual <img src> values inside the portfolio.
const portfolioImgs = await page.$$eval('img', (imgs) =>
  imgs.map(i => ({
    src: i.currentSrc || i.src,
    alt: i.alt,
    naturalW: i.naturalWidth,
    naturalH: i.naturalHeight,
    complete: i.complete,
    visible: i.offsetWidth > 0 && i.offsetHeight > 0,
  }))
);
L(`  <img> count on page: ${portfolioImgs.length}`);
portfolioImgs.forEach((i, n) => {
  L(`    [${n}] visible=${i.visible} complete=${i.complete} nat=${i.naturalW}x${i.naturalH} src=${i.src.slice(0,140)}`);
});
await screenshot('03_properties_portfolio');
await dumpImgs('/#/properties');

L('\n=== STEP 4: Navigate to #/properties/T-2010-AA-01 (detail) ===');
const beforeDetail = imgRequests.length;
await page.goto(`${BASE}/#/properties/T-2010-AA-01`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.waitForLoadState('networkidle').catch(()=>{});
L(`  url: ${page.url()}`);

const detailImgs = await page.$$eval('img', (imgs) =>
  imgs.map(i => ({
    src: i.currentSrc || i.src,
    alt: i.alt,
    naturalW: i.naturalWidth,
    naturalH: i.naturalHeight,
    complete: i.complete,
    visible: i.offsetWidth > 0 && i.offsetHeight > 0,
  }))
);
L(`  <img> count on page: ${detailImgs.length}`);
detailImgs.forEach((i, n) => {
  L(`    [${n}] visible=${i.visible} complete=${i.complete} nat=${i.naturalW}x${i.naturalH} src=${i.src.slice(0,140)}`);
});
await screenshot('04_property_detail_T-2010-AA-01');

const detailOnly = imgRequests.slice(beforeDetail);
L(`\n--- IMG requests during /#/properties/T-2010-AA-01 (${detailOnly.length}) ---`);
detailOnly.forEach(r => L(`  ${r.status}  ${r.url}`));

L('\n=== STEP 5: Probe a wrong/typo path (negative probe) ===');
await page.goto(`${BASE}/#/properties/DOES-NOT-EXIST-999`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const negTitle = (await page.title()).slice(0, 120);
const negBody = (await page.locator('body').innerText()).slice(0, 300).replace(/\s+/g, ' ');
L(`  title: ${negTitle}`);
L(`  body excerpt: ${negBody}`);
await screenshot('05_property_detail_bogus_id');

L('\n=== SUMMARY ===');
const unsplashHits = imgRequests.filter(r => /unsplash/i.test(r.url));
const localBuildingHits = imgRequests.filter(r => /\/assets\/images\/buildings\/BLD-\d+\.jpg/i.test(r.url));
const failed = imgRequests.filter(r => r.status >= 400);
L(`  Total image responses observed: ${imgRequests.length}`);
L(`  Unsplash image responses:        ${unsplashHits.length}`);
L(`  Local /assets/images/buildings/: ${localBuildingHits.length}`);
L(`  Failed (>=400) image responses:  ${failed.length}`);
if (unsplashHits.length)    unsplashHits.forEach(r => L(`    UNSPLASH! ${r.status} ${r.url}`));
if (failed.length)          failed.forEach(r => L(`    FAILED!   ${r.status} ${r.url}`));
if (localBuildingHits.length) localBuildingHits.forEach(r => L(`    LOCAL OK  ${r.status} ${r.url}`));

writeFileSync(`${OUT}/run.log`, log.join('\n'));
writeFileSync(`${OUT}/image_responses.json`, JSON.stringify(imgRequests, null, 2));
await browser.close();
