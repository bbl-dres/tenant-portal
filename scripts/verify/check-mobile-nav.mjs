// Mobile burger-menu behaviour checks (Playwright).
//
// Guards the fixes for:
//   1. Drawer not closing when a nav item is clicked — the scroll-lock
//      class `body--mobile-menu-is-open` + focus trap live on <body> and
//      used to survive the route re-render, leaving a dead full-screen
//      drawer over the new page.
//   2. The drawer's fixed top (CSS assumes 72 px) being wrong while the
//      cookie-consent banner pushes the header down — the brand bar then
//      floated mid-drawer and stole clicks. toggleBurger now measures the
//      header's real bottom edge.
//   3. "Dienstleistungen" sub-menu rendering as an in-drawer accordion
//      below 1024 px (desktop keeps the floating card).
//
// Run: npm run verify:mobile-nav
import { chromium } from 'playwright';
import { startServer, makeReporter } from './lib.mjs';

const { server, baseUrl } = await startServer();
const { check, finish } = makeReporter('check-mobile-nav');
const browser = await chromium.launch();

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  // ── Drawer opens below the real header bottom (consent banner visible) ──
  await page.goto(`${baseUrl}/#/home?lang=de`);
  await page.waitForSelector('.burger', { timeout: 10000 });
  await page.click('.burger');
  await page.waitForTimeout(300);
  check('drawer opens (scroll lock + visible navbar)', await page.evaluate(() =>
    document.body.classList.contains('body--mobile-menu-is-open') &&
    getComputedStyle(document.querySelector('.navbar')).display !== 'none'));
  const align = await page.evaluate(() => {
    const navTop = document.querySelector('.navbar').getBoundingClientRect().top;
    const headerBottom = document.querySelector('.top-header').getBoundingClientRect().bottom;
    return { navTop: Math.round(navTop), headerBottom: Math.round(headerBottom) };
  });
  check('drawer starts at the header bottom (banner-safe)',
    Math.abs(align.navTop - align.headerBottom) < 2, JSON.stringify(align));

  // ── Clicking a top-level item closes the drawer and navigates ──────────
  await page.click('#mainNavigation a[href="#/properties"]');
  await page.waitForTimeout(400);
  check('drawer closes after nav click', await page.evaluate(() =>
    !document.body.classList.contains('body--mobile-menu-is-open')));
  check('navigated to target route', (await page.evaluate(() => location.hash)).startsWith('#/properties'));
  check('page scroll unlocked', await page.evaluate(() =>
    getComputedStyle(document.body).overflow !== 'hidden'));

  // ── Same-route click (no hashchange, no re-render) still closes ────────
  await page.click('.burger');
  await page.waitForTimeout(300);
  await page.click('#mainNavigation a[href="#/properties"]');
  await page.waitForTimeout(400);
  check('drawer closes on same-route click', await page.evaluate(() =>
    !document.body.classList.contains('body--mobile-menu-is-open')));

  // ── Sub-menu accordion inside the drawer ────────────────────────────────
  await page.click('.burger');
  await page.waitForTimeout(300);
  await page.click('button[data-menu="services"]');
  await page.waitForTimeout(300);
  const panel = await page.evaluate(() => {
    const p = document.getElementById('navMenu-services');
    if (!p || p.hidden) return null;
    const r = p.getBoundingClientRect();
    const trig = document.querySelector('button[data-menu="services"]').getBoundingClientRect();
    return { position: getComputedStyle(p).position, height: r.height, gap: Math.round(r.top - trig.bottom) };
  });
  check('services panel opens as in-flow accordion',
    !!panel && panel.position === 'static' && panel.height > 0 && Math.abs(panel.gap) < 2,
    JSON.stringify(panel));

  await page.click('#navMenu-services a[href="#/repair"]');
  await page.waitForTimeout(400);
  check('drawer closes after sub-link click', await page.evaluate(() =>
    !document.body.classList.contains('body--mobile-menu-is-open')));
  check('sub-link navigated', (await page.evaluate(() => location.hash)).startsWith('#/repair'));

  // ── Esc closes the drawer ───────────────────────────────────────────────
  await page.click('.burger');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check('Esc closes the drawer', await page.evaluate(() =>
    !document.body.classList.contains('body--mobile-menu-is-open')));

  // ── History back while drawer is open (hashchange safety net) ──────────
  await page.click('.burger');
  await page.waitForTimeout(300);
  await page.goBack();
  await page.waitForTimeout(400);
  check('drawer cleaned up after history back', await page.evaluate(() =>
    !document.body.classList.contains('body--mobile-menu-is-open')));

  // ── Desktop regression: dropdown still floats under its trigger ────────
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}/#/home?lang=de`);
  await page.waitForSelector('button[data-menu="services"]', { timeout: 10000 });
  await page.click('button[data-menu="services"]');
  await page.waitForTimeout(300);
  const desk = await page.evaluate(() => {
    const p = document.getElementById('navMenu-services');
    if (!p || p.hidden) return null;
    const r = p.getBoundingClientRect();
    const trig = document.querySelector('button[data-menu="services"]').getBoundingClientRect();
    return {
      position: getComputedStyle(p).position,
      width: Math.round(r.width),
      dLeft: Math.round(r.left - trig.left),
      dTop: Math.round(r.top - trig.bottom)
    };
  });
  check('desktop dropdown floats anchored under trigger',
    !!desk && desk.position === 'absolute' && desk.width === 480 &&
    Math.abs(desk.dLeft) < 8 && Math.abs(desk.dTop) < 8,
    JSON.stringify(desk));
} finally {
  await browser.close();
  server.close();
}
finish();
