// Property image data-quality checks (Playwright).
//
// Successor to the retired verify_property_images.mjs one-shot: the
// portfolio and property-detail views must render LOCAL building photos
// (assets/images/buildings/), never stock-photo hosts (Unsplash et al.),
// and every same-origin image must actually resolve (no 404s) and decode
// (no broken <img>). External map-tile hosts (MapLibre basemap) are out
// of scope and ignored.
//
// Run: npm run verify:property-images
import { chromium } from 'playwright';
import { startServer, makeReporter } from './lib.mjs';

const { server, baseUrl } = await startServer();
const { check, finish } = makeReporter('check-property-images');
const browser = await chromium.launch();

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const imgResponses = [];
  page.on('response', (resp) => {
    const url = resp.url();
    const type = resp.headers()['content-type'] || '';
    if (/\.(jpe?g|png|webp|gif|svg)(\?|$)/i.test(url) || type.startsWith('image/')) {
      imgResponses.push({ url, status: resp.status() });
    }
  });

  for (const hash of ['#/properties', '#/properties/T-2010-AA-01']) {
    // NB: after the first load this is a same-document hash navigation, so
    // repeated images are served from memory cache and emit no response
    // events — per-view source checks therefore read the DOM, while the
    // response log is only used for session-wide host/status assertions.
    await page.goto(`${baseUrl}/${hash}?lang=de`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    const imgs = await page.$$eval('img', (els) =>
      els.filter(i => i.offsetWidth > 0)
         .map(i => ({ src: i.currentSrc || i.src, broken: i.complete && i.naturalWidth === 0 })));
    const stockImgs = imgs.filter(i => /unsplash|pexels|pixabay|picsum/i.test(i.src));
    check(`${hash}: no stock-photo <img> sources`, stockImgs.length === 0,
      stockImgs.map(i => i.src.slice(0, 120)).join(', '));
    const localBuildings = imgs.filter(i => /\/assets\/images\/buildings\//i.test(i.src));
    check(`${hash}: local building photos rendered`, localBuildings.length > 0,
      `${localBuildings.length} <img>`);
    const broken = imgs.filter(i => i.broken);
    check(`${hash}: no broken <img> elements`, broken.length === 0,
      broken.map(i => i.src.slice(0, 120)).join(', '));
  }

  // Session-wide network assertions across both views.
  const stockResp = imgResponses.filter(r => /unsplash|pexels|pixabay|picsum/i.test(r.url));
  check('session: no stock-photo hosts requested', stockResp.length === 0,
    stockResp.map(r => r.url).join(', '));
  const failed = imgResponses.filter(r => r.url.startsWith(baseUrl) && r.status >= 400);
  check('session: no failed same-origin image requests', failed.length === 0,
    failed.map(r => `${r.status} ${r.url}`).join(', '));
} finally {
  await browser.close();
  server.close();
}
finish();
