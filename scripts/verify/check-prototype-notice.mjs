// Prototype-disclaimer notice checks (Playwright).
//
// The notice is the CD Bund `NotificationBanner` in its fixed variant — the
// component the design system uses for cookie consent — carrying the
// prototype disclaimer instead. Guarded invariants:
//
//   1. Session scope, not "once ever": every new browser session sees it
//      again, so a demo shown to a second person is never silently
//      undisclosed. Dismissal holds for the rest of that session.
//   2. URL-independent: bookmarks point at deep routes, so the notice rides
//      in renderShell (mounted by every route), not on the landing page.
//   3. Sequenced with the cookie banner — a first-time visitor never faces
//      two stacked consent bars; the cookie bar appears on dismissal.
//   4. It reserves its own space instead of covering the footer, and the
//      toast host rides above it.
//   5. Localised through data/i18n.json like the rest of the chrome, and the
//      top-bar chip reads "Prototyp".
//
// This is the one verify script that does NOT call suppressPrototypeNotice.
//
// Run: npm run verify:prototype-notice
import { chromium } from 'playwright';
import { startServer, makeReporter, run, waitForRoute } from './lib.mjs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'verify_out');
const { server, baseUrl } = await startServer();
const reporter = makeReporter('check-prototype-notice');
const { check } = reporter;
const browser = await chromium.launch();

const NOTICE = '#prototypeNotice';

// `#/` settles on the role home now that the prototype boots signed in, and on
// the public landing after an explicit sign-out. Both are "the entry page" for
// this check — it is about the disclaimer, not about which entry page renders.
const LANDING = ['#/', '#/home'];

// A fresh context = a fresh sessionStorage = a fresh visit.
async function newSession(width = 1280, height = 900) {
  const context = await browser.newContext({ viewport: { width, height } });
  return { context, page: await context.newPage() };
}

await run(reporter, async () => {
  // ── 1. Deep links: every bookmarkable route shows the notice ────────────
  // Entry page, an authenticated list, a detail page and a nested detail
  // route — exactly the bookmark path a returning demo user takes.
  const ROUTES = [
    ['#/', LANDING],
    ['#/downloads', '#/downloads'],
    ['#/properties/T-2010-AA-01', '#/properties/T-2010-AA-01'],
    ['#/properties/T-2010-AA-01/floors/2og', '#/properties/T-2010-AA-01/floors/2og'],
  ];
  for (const [hash, settled] of ROUTES) {
    const { context, page } = await newSession();
    await page.goto(`${baseUrl}/${hash}?lang=de`);
    await waitForRoute(page, settled);
    const shown = await page.locator(NOTICE).isVisible().catch(() => false);
    check(`deep link ${hash}: notice shows on a fresh session`, shown);
    await context.close();
  }

  // ── 2. Content + component identity ─────────────────────────────────────
  const { context, page } = await newSession();
  await page.goto(`${baseUrl}/#/?lang=de`);
  await waitForRoute(page, LANDING);

  const anatomy = await page.evaluate(() => {
    const el = document.getElementById('prototypeNotice');
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      classes: el.className,
      role: el.getAttribute('role'),
      labelledby: el.getAttribute('aria-labelledby'),
      labelText: document.getElementById(el.getAttribute('aria-labelledby') || '')?.textContent?.trim() || '',
      text: el.textContent.replace(/\s+/g, ' ').trim(),
      position: cs.position,
      atBottom: Math.abs(r.bottom - window.innerHeight) < 2,
      fullWidth: r.width >= window.innerWidth - 2,
      hasIcon: !!el.querySelector('.notification-banner__icon svg'),
      titleIsBold: el.querySelector('strong#prototypeNoticeTitle')?.textContent?.trim() || '',
      ackLabel: el.querySelector('#prototypeNoticeAck')?.textContent?.trim() || '',
    };
  });
  // The DS composes the two layers on one element — NotificationBanner.vue
  // emits `notification-banner [--fixed] notification notification--<type>`.
  check('composes the CD notification + fixed banner classes',
    !!anatomy && /\bnotification-banner\b/.test(anatomy.classes)
      && /\bnotification-banner--fixed\b/.test(anatomy.classes)
      && /\bnotification\b/.test(anatomy.classes)
      && /\bnotification--info\b/.test(anatomy.classes),
    anatomy?.classes);
  check('pinned full-width to the bottom edge',
    !!anatomy && anatomy.position === 'fixed' && anatomy.atBottom && anatomy.fullWidth,
    JSON.stringify({ position: anatomy?.position, atBottom: anatomy?.atBottom, fullWidth: anatomy?.fullWidth }));
  // The banner carries no status glyph by design (the cookie banner keeps
  // one). WCAG 1.4.1 is satisfied by the bold lead sentence naming the status
  // in words, so that is what has to be asserted — and the icon has to STAY
  // gone, or the quiet-note tone silently regresses to an alert.
  check('states its status in text, not by tint alone (WCAG 1.4.1)',
    !!anatomy && !anatomy.hasIcon && anatomy.titleIsBold.length > 0,
    anatomy?.titleIsBold);
  check('landmark has an accessible name',
    !!anatomy && anatomy.role === 'region' && !!anatomy.labelledby && anatomy.labelText.length > 0,
    anatomy?.labelText);
  check('states the prototype disclaimer (de)',
    !!anatomy && anatomy.text.includes('Diese Anwendung ist ein Prototyp.')
      && anatomy.text.includes('dienen ausschliesslich der Demonstration'),
    anatomy?.text.slice(0, 120));
  check('discloses the nature of the data',
    !!anatomy && /Daten sind fiktiv oder öffentlich zugänglich/.test(anatomy.text));
  check('acknowledge button is labelled', /Verstanden/.test(anatomy?.ackLabel || ''), anatomy?.ackLabel);

  // ── 3. It reserves space rather than covering the page ─────────────────
  // The height is republished by a ResizeObserver once the web font swaps in,
  // so wait for the reserved space to converge on the rendered height rather
  // than sampling whatever the first synchronous measurement produced.
  await page.waitForFunction(() => {
    const el = document.getElementById('prototypeNotice');
    const reserved = parseFloat(getComputedStyle(document.getElementById('root')).paddingBottom) || 0;
    return el && Math.abs(reserved - el.getBoundingClientRect().height) < 2;
  }, null, { timeout: 5000 });
  const spacing = await page.evaluate(() => {
    const el = document.getElementById('prototypeNotice');
    const root = document.getElementById('root');
    const h = el.getBoundingClientRect().height;
    const reserved = parseFloat(getComputedStyle(root).paddingBottom) || 0;
    const varH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--prototype-notice-h')) || 0;
    return { h, reserved, varH, bodyClass: document.body.classList.contains('body--prototype-notice') };
  });
  check('page reserves the banner height (footer stays reachable)',
    spacing.bodyClass && spacing.reserved > 0 && Math.abs(spacing.reserved - spacing.h) < 2,
    JSON.stringify(spacing));

  // A toast raised while the notice is up must not hide behind it.
  await page.evaluate(() => window.portal.toast('Prüfton', 'success'));
  await page.waitForTimeout(120);
  const toastClear = await page.evaluate(() => {
    const t = document.querySelector('.toast-host');
    const n = document.getElementById('prototypeNotice');
    if (!t || !n) return null;
    return t.getBoundingClientRect().bottom <= n.getBoundingClientRect().top + 1;
  });
  check('toasts stack above the notice', toastClear === true);

  await page.screenshot({ path: join(OUT, 'prototype-notice.png') });

  // ── 4. Survives navigation until dismissed ──────────────────────────────
  // Public routes only from here: this session never logs in, and the gated
  // views bounce an anonymous visitor back to `#/`.
  await page.goto(`${baseUrl}/#/info?lang=de`);
  await waitForRoute(page, '#/info');
  check('persists across in-session navigation', await page.locator(NOTICE).isVisible());

  // ── 5. Dismissal, and the cookie banner taking its turn ─────────────────
  check('cookie banner is held back while the disclaimer is up',
    await page.locator('#cookieBanner').count() === 0);
  await page.locator('#prototypeNoticeAck').click();
  await page.waitForTimeout(120);
  check('acknowledge removes the notice', await page.locator(NOTICE).count() === 0);
  check('reserved space is released after dismissal',
    await page.evaluate(() => (parseFloat(getComputedStyle(document.getElementById('root')).paddingBottom) || 0) === 0));
  check('cookie banner appears once the disclaimer is acknowledged',
    await page.locator('#cookieBanner').isVisible());

  await page.goto(`${baseUrl}/#/login?lang=de`);
  await waitForRoute(page, '#/login');
  check('stays dismissed after navigating to another route',
    await page.locator(NOTICE).count() === 0);
  await context.close();

  // ── 6. A NEW session brings it back (the point of session scope) ────────
  const second = await newSession();
  await second.page.goto(`${baseUrl}/#/downloads?lang=de`);
  await waitForRoute(second.page, '#/downloads');
  check('a new session sees the disclaimer again', await second.page.locator(NOTICE).isVisible());
  await second.context.close();

  // ── 7. Localisation + the top-bar chip ──────────────────────────────────
  const LANGS = [
    ['de', 'Diese Anwendung ist ein Prototyp.', 'Prototyp'],
    ['fr', 'Cette application est un prototype.', 'Prototype'],
    ['it', 'Questa applicazione è un prototipo.', 'Prototipo'],
    ['en', 'This application is a prototype.', 'Prototype'],
  ];
  for (const [lang, expected, chipText] of LANGS) {
    const s = await newSession();
    await s.page.goto(`${baseUrl}/#/?lang=${lang}`);
    await waitForRoute(s.page, LANDING);
    const got = await s.page.evaluate(() =>
      document.getElementById('prototypeNotice')?.textContent.replace(/\s+/g, ' ').trim() || '');
    check(`notice is localised (${lang})`, got.includes(expected), got.slice(0, 80));
    const chip = await s.page.evaluate(() =>
      document.querySelector('.top-bar__demo-chip')?.textContent.trim() || '');
    check(`top-bar chip reads "${chipText}" (${lang})`, chip === chipText, chip);
    await s.context.close();
  }

  // ── 8. Phone width: no horizontal overflow, full-width action ───────────
  const mobile = await newSession(390, 844);
  await mobile.page.goto(`${baseUrl}/#/?lang=de`);
  await waitForRoute(mobile.page, LANDING);
  const m = await mobile.page.evaluate(() => {
    const el = document.getElementById('prototypeNotice');
    const btn = el.querySelector('#prototypeNoticeAck').getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      within: r.right <= window.innerWidth + 1 && r.left >= -1,
      heightShare: r.height / window.innerHeight,
      btnW: btn.width,
      btnH: btn.height,
    };
  });
  check('390 px: no horizontal overflow', m.overflow <= 0, `scrollWidth-clientWidth=${m.overflow}`);
  check('390 px: banner stays inside the viewport', m.within, JSON.stringify(m));
  check('390 px: leaves the page usable (< 60 % of the viewport)', m.heightShare < 0.6, m.heightShare.toFixed(2));
  // Auto-width — the DS banner keeps the action at its natural size below lg
  // (column wrapper, no stretch; notification-banner.postcss:5-27) and the
  // service-portal renders the same. The former full-width assertion pinned a
  // portal-only stretch, retired in the 2026-08 cross-portal alignment
  // (docs/design-alignment.md D32). The 44 px WCAG floor stays asserted.
  check('390 px: acknowledge button is an auto-width, tappable target (CD column layout)',
    m.btnW >= 100 && m.btnW < 250 && m.btnH >= 44, JSON.stringify({ btnW: m.btnW, btnH: m.btnH }));
  await mobile.page.screenshot({ path: join(OUT, 'prototype-notice-mobile.png') });
  await mobile.context.close();
}, async () => {
  await browser.close();
  server.close();
});
