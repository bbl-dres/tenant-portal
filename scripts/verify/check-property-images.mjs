// Property image data-quality checks (Playwright).
//
// Successor to the retired verify_property_images.mjs one-shot. The
// invariant: ALL imagery ships with the repo — every image must be
// same-origin (allowlist: the MapLibre basemap tile host), so a stray
// Unsplash/CDN URL fails regardless of which host it is. Same-origin
// images must also resolve (no 404s) and decode (no broken <img>).
//
// Run: npm run verify:property-images
import { chromium } from 'playwright';
import { startServer, makeReporter, run, waitForRoute, suppressPrototypeNotice, loginAs } from './lib.mjs';

const { server, baseUrl } = await startServer();
const reporter = makeReporter('check-property-images');
const { check } = reporter;
const browser = await chromium.launch();

await run(reporter, async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await suppressPrototypeNotice(page);

  const imgResponses = [];
  page.on('response', (resp) => {
    const url = resp.url();
    const type = resp.headers()['content-type'] || '';
    if (/\.(jpe?g|png|webp|gif|svg)(\?|$)/i.test(url) || type.startsWith('image/')) {
      imgResponses.push({ url, status: resp.status() });
    }
  });

  // Property views sit behind the login gate for logged-out visitors (the
  // former silent deep-link auto-login is gone) — authenticate first. The
  // subsequent goto calls differ only in hash, so they are same-document
  // navigations and the in-memory login survives them.
  await loginAs(page, baseUrl, 'LBO');
  // loginAs renders the landing page, whose news teasers currently load
  // Unsplash imagery (data/news.json — pre-existing, tracked in
  // docs/design-review.md). This check's mandate is PROPERTY imagery, so
  // scope the session-wide assertions to what follows the login, exactly
  // as before the auth gate existed.
  imgResponses.length = 0;

  for (const hash of ['#/properties', '#/properties/T-2010-AA-01']) {
    // NB: after the first load this is a same-document hash navigation, so
    // repeated images are served from memory cache and emit no response
    // events — per-view source checks therefore read the DOM, while the
    // response log is only used for session-wide host/status assertions.
    await page.goto(`${baseUrl}/${hash}?lang=de`);
    await waitForRoute(page, hash);
    // Image loads trail the render — wait for the network to go quiet.
    await page.waitForLoadState('networkidle');

    const imgs = await page.$$eval('img', (els) =>
      els.filter(i => i.offsetWidth > 0)
         .map(i => ({ src: i.currentSrc || i.src, broken: i.complete && i.naturalWidth === 0 })));
    // Allowlist, not denylist: anything not served by us (or the basemap
    // tile host) is a foreign dependency, whatever the hostname.
    const foreign = imgs.filter(i =>
      !i.src.startsWith(baseUrl) && !/^https:\/\/([a-z0-9]+\.)?basemaps\.cartocdn\.com\//.test(i.src));
    check(`${hash}: all <img> sources same-origin (basemap excepted)`, foreign.length === 0,
      foreign.map(i => i.src.slice(0, 120)).join(', '));
    const localBuildings = imgs.filter(i => /\/assets\/images\/buildings\//i.test(i.src));
    check(`${hash}: local building photos rendered`, localBuildings.length > 0,
      `${localBuildings.length} <img>`);
    const broken = imgs.filter(i => i.broken);
    check(`${hash}: no broken <img> elements`, broken.length === 0,
      broken.map(i => i.src.slice(0, 120)).join(', '));
  }

  // Session-wide network assertions across both views.
  const foreignResp = imgResponses.filter(r =>
    !r.url.startsWith(baseUrl) && !/^https:\/\/([a-z0-9]+\.)?basemaps\.cartocdn\.com\//.test(r.url));
  check('session: no foreign image hosts requested (basemap excepted)', foreignResp.length === 0,
    foreignResp.map(r => r.url.slice(0, 120)).join(', '));
  const failed = imgResponses.filter(r => r.url.startsWith(baseUrl) && r.status >= 400);
  check('session: no failed same-origin image requests', failed.length === 0,
    failed.map(r => `${r.status} ${r.url}`).join(', '));
}, async () => {
  await browser.close();
  server.close();
});
