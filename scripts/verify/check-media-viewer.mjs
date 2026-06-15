// Document viewer + property image gallery checks (Playwright).
//
// Guards two features that share the dark `.docviewer`/`.gallery` chrome:
//
//   1. Document preview — left/right chevrons page through the documents
//      available in the view it was opened from (downloads table / property
//      doc-groups), with a "Dokument X / Y" indicator. ArrowLeft/Right work.
//
//   2. Property image gallery — the header photo is a button carrying a
//      persistent "Galerie" badge (+ count when >1). Clicking opens a dark
//      lightbox: image name top-left, download/upload/delete top-right, side
//      chevrons + bottom thumbnail strip (both only with 2+ images). Upload
//      reads files locally (FileReader); delete/upload mutate the in-session
//      gallery and the header badge/count stays in sync.
//
// Run: npm run verify:media-viewer
import { chromium } from 'playwright';
import { startServer, makeReporter, run, loginAs, waitForRoute } from './lib.mjs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'verify_out');
const { server, baseUrl } = await startServer();
const reporter = makeReporter('check-media-viewer');
const { check } = reporter;
const browser = await chromium.launch();

await run(reporter, async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await loginAs(page, baseUrl, 'LBO');

  // ── 0. Search-field consistency across the filter toolbars ─────────────
  // Every in-page search box composes the shared `.search-field` (leading
  // left magnifier + `.input`), so the affordance is identical everywhere.
  for (const [hash, label, required] of [['#/downloads', 'downloads', true], ['#/properties', 'properties', true], ['#/inbox', 'inbox', false]]) {
    await page.goto(`${baseUrl}/${hash}?lang=de`);
    await waitForRoute(page, hash);
    const sf = await page.evaluate(() => {
      const field = document.querySelector('#page-body .search-field');
      if (!field) return null;
      const icon = field.querySelector('.search-field__icon');
      const input = field.querySelector('.search-field__input');
      if (!icon || !input) return { ok: false };
      const ir = icon.getBoundingClientRect(), pr = input.getBoundingClientRect();
      return { ok: true, leading: ir.left < pr.left + pr.width / 2 && ir.left >= pr.left - 2 };
    });
    if (!sf && !required) { check(`${label}: no filter toolbar rendered (skipped)`, true); continue; }
    check(`${label}: search uses shared .search-field with a leading icon`, !!sf && sf.ok && sf.leading, JSON.stringify(sf));
  }

  // The search-results hero composes the same component and auto-focuses.
  await page.goto(`${baseUrl}/#/search?q=bafu&lang=de`);
  await waitForRoute(page, '#/search');
  await page.waitForTimeout(80);
  const heroFocused = await page.evaluate(() => {
    const f = document.querySelector('.search-hero__field.search-field .search-field__input');
    return !!f && document.activeElement === f;
  });
  check('search results: hero uses .search-field and auto-focuses', heroFocused);

  // Browser-tab favicon = the CD Bund flag.
  const favicon = await page.evaluate(() => document.querySelector('link[rel~="icon"]')?.getAttribute('href'));
  check('browser tab favicon is the CD Bund flag', favicon === 'assets/swiss-logo-flag.svg', favicon || '(none)');

  // Federal mark: the flag top-aligns with the 4-language name SVG (CD), not
  // centred against it. (Name is visible at this 1280px width.)
  const logoAlign = await page.evaluate(() => {
    const flag = document.querySelector('.top-header__bundmark-flag');
    const name = document.querySelector('.top-header__bundmark-name');
    if (!flag || !name) return { skip: true };
    const f = flag.getBoundingClientRect(), n = name.getBoundingClientRect();
    return { nameVisible: n.width > 0, dy: Math.abs(f.top - n.top) };
  });
  check('header logo: flag top-aligns with the name SVG',
    logoAlign.skip || !logoAlign.nameVisible || logoAlign.dy <= 4, JSON.stringify(logoAlign));

  // Footer bottom strip: CD text--xs size + the accessibility link target.
  const footer = await page.evaluate(() => {
    const inner = document.querySelector('.app-footer__bottom-inner');
    const a11y = document.querySelector('.app-footer__bottom-link[href*="barrierefreiheit"]');
    const root = document.documentElement;
    const xs = getComputedStyle(root).getPropertyValue('--text-body-xs').trim();
    const remPx = parseFloat(getComputedStyle(root).fontSize) || 16;
    const xsPx = xs.endsWith('rem') ? parseFloat(xs) * remPx : parseFloat(xs);
    return { fontPx: inner ? parseFloat(getComputedStyle(inner).fontSize) : null, xsPx, href: a11y?.getAttribute('href') };
  });
  check('footer bottom strip uses CD text--xs size', footer.fontPx != null && Math.abs(footer.fontPx - footer.xsPx) < 0.6, JSON.stringify(footer));
  check('footer accessibility link uses the EBGB URL', footer.href === 'https://www.ebgb.admin.ch/de/barrierefreiheit-in-der-bundesverwaltung', footer.href);

  // Scroll-to-top on route (path) change — hash routing doesn't reset scroll.
  // Use the long-form info page as the tall "before" surface. Scroll via
  // direct scrollTop (instant — `scrollTo` would be smooth-animated here).
  const scrollTop = () => page.evaluate(() => (document.scrollingElement || document.documentElement).scrollTop);
  await page.goto(`${baseUrl}/#/info?lang=de`);
  await waitForRoute(page, '#/info');
  await page.waitForFunction(() => (document.scrollingElement || document.documentElement).scrollHeight > 2000, null, { timeout: 5000 });
  await page.mouse.move(640, 450);     // wheel = user scroll (no lingering smooth animation, unlike scrollTo)
  await page.mouse.wheel(0, 3000);
  await page.waitForTimeout(200);
  const beforeY = await scrollTop();
  await page.evaluate(() => { location.hash = '#/downloads'; });
  await waitForRoute(page, '#/downloads');
  await page.waitForTimeout(150);
  const afterY = await scrollTop();
  check('navigating to a new route scrolls to top', beforeY > 100 && afterY === 0, `before=${beforeY} after=${afterY}`);

  // ── 1. Document viewer — page between available documents ──────────────
  await page.goto(`${baseUrl}/#/downloads?lang=de`);
  await waitForRoute(page, '#/downloads');

  // Header consistency: downloads uses the canonical .page-header pattern
  // (same as #/properties etc.), not the old section-heading/section-intro.
  const header = await page.evaluate(() => {
    const body = document.getElementById('page-body');
    return {
      pageHeader: !!body.querySelector('.page-header > div > .page-header__title') &&
                  !!body.querySelector('.page-header .page-header__sub'),
      legacy: !!body.querySelector('.section-heading, .section-intro'),
    };
  });
  check('downloads: uses the canonical .page-header pattern', header.pageHeader);
  check('downloads: no legacy section-heading/section-intro header', !header.legacy);

  // Pagination uses the shared paginationShell markup; downloads keeps its
  // in-place (button) mechanism. Verify the nav rendered + a page advance.
  check('downloads: pagination renders the shared .pagination nav',
    await page.locator('#docPagination nav.pagination').count() === 1);
  const maxPages = Number(await page.locator('#docPaginationInput').getAttribute('max'));
  if (maxPages > 1) {
    await page.locator('#docPagination button[data-step="1"]').click();
    await page.waitForTimeout(80);
    check('downloads: in-place pagination advances to page 2',
      (await page.locator('#docPaginationInput').inputValue()) === '2');
    await page.locator('#docPagination button[data-step="-1"]').click();   // reset for later steps
    await page.waitForTimeout(80);
  } else {
    check('downloads: single page — pagination advance skipped', true);
  }

  await page.locator('[data-doc-id]').first().click();
  await page.waitForSelector('.docviewer', { timeout: 10000 });

  const title1 = (await page.locator('.docviewer__title').textContent())?.trim();
  check('docviewer: next/prev chevrons present with multiple documents',
    await page.locator('.docviewer__nav--next').count() > 0 &&
    await page.locator('.docviewer__nav--prev').count() > 0);
  const docnum = (await page.locator('.docviewer__docnum').textContent().catch(() => ''))?.trim();
  check('docviewer: "Dokument X / Y" indicator shown', /Dokument\s+\d+\s*\/\s*\d+/.test(docnum || ''), docnum);

  await page.locator('.docviewer__nav--next').click();
  await page.waitForTimeout(120);
  const title2 = (await page.locator('.docviewer__title').textContent())?.trim();
  check('docviewer: next chevron switches document', title1 !== title2, `${title1} → ${title2}`);

  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(120);
  const title3 = (await page.locator('.docviewer__title').textContent())?.trim();
  check('docviewer: ArrowLeft returns to the previous document', title3 === title1, title3);

  // ── Single global scrollbar: the viewer scrolls, header sticky ─────────
  const scrollModel = await page.evaluate(() => {
    const dv = document.querySelector('.docviewer');
    const stage = document.querySelector('.docviewer__stage');
    const bar = document.querySelector('.docviewer__bar');
    return {
      viewerScrolls: dv.scrollHeight > dv.clientHeight + 4,
      stageOverflowY: getComputedStyle(stage).overflowY,
      barPosition: getComputedStyle(bar).position,
      htmlOverflowY: getComputedStyle(document.documentElement).overflowY,
    };
  });
  check('docviewer: the viewer itself is the single scroll container',
    scrollModel.viewerScrolls && scrollModel.stageOverflowY === 'visible', JSON.stringify(scrollModel));
  check('docviewer: header bar is sticky over the scrolling pages', scrollModel.barPosition === 'sticky');
  check('docviewer: underlying page is scroll-locked (no second scrollbar)',
    scrollModel.htmlOverflowY === 'hidden', scrollModel.htmlOverflowY);

  const shareNextToComments = await page.evaluate(() => {
    const share = document.querySelector('.docviewer__btn[data-act="share"]');
    return share?.nextElementSibling?.getAttribute('data-act') === 'comments';
  });
  check('docviewer: share icon sits immediately left of comments', shareNextToComments);

  const pageBefore = (await page.locator('[data-page-indicator]').textContent())?.trim();
  await page.evaluate(() => { const dv = document.querySelector('.docviewer'); dv.scrollTop = dv.scrollHeight; });
  await page.waitForTimeout(150);
  const pageAfter = (await page.locator('[data-page-indicator]').textContent())?.trim();
  check('docviewer: page indicator tracks the single scrollbar', pageBefore !== pageAfter, `${pageBefore} → ${pageAfter}`);

  // ── Share popover (Confluence-style direct share) ──────────────────────
  await page.locator('.docviewer__btn[data-act="share"]').click();
  await page.waitForSelector('.docviewer-share', { timeout: 5000 });
  const shareUrl = await page.locator('.docviewer-share__input').inputValue();
  check('docviewer: share popover offers a document deep link', /#\/downloads\?doc=/.test(shareUrl), shareUrl);
  check('docviewer: share popover has an e-mail shortcut', await page.locator('.docviewer-share__mail').count() > 0);
  await page.screenshot({ path: join(OUT, 'media-viewer-docviewer.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(80);
  check('docviewer: Esc dismisses the popover but keeps the viewer open',
    await page.locator('.docviewer-share').count() === 0 && await page.locator('.docviewer').count() === 1);

  await page.locator('.docviewer__btn--close').click();
  await page.waitForTimeout(60);
  check('docviewer: closes and restores the page', await page.locator('.docviewer').count() === 0);

  // ── Shared deep link reopens the document ──────────────────────────────
  const sharedId = decodeURIComponent(shareUrl.split('doc=')[1].split('&')[0]);
  await page.goto(`${baseUrl}/#/downloads?doc=${encodeURIComponent(sharedId)}&lang=de`);
  await waitForRoute(page, '#/downloads');
  await page.waitForSelector('.docviewer', { timeout: 5000 });
  check('docviewer: shared ?doc= link auto-opens the document', await page.locator('.docviewer').count() === 1);
  await page.locator('.docviewer__btn--close').click();
  await page.waitForTimeout(60);

  // ── 2. Property header — persistent gallery affordance ─────────────────
  await page.goto(`${baseUrl}/#/properties/T-2010-AA-01?lang=de`);
  await waitForRoute(page, '#/properties/T-2010-AA-01');
  const badge = await page.evaluate(() => {
    const b = document.querySelector('.property-header__media-badge');
    if (!b) return null;
    const cs = getComputedStyle(b);
    const r = b.getBoundingClientRect();
    return {
      shown: cs.display !== 'none' && Number(cs.opacity) > 0.5 && r.width > 0 && r.height > 0,
      label: b.querySelector('.property-header__media-label')?.textContent?.trim(),
      countHidden: b.querySelector('[data-gallery-count]')?.hidden,
    };
  });
  check('header: gallery badge visible without hover', !!badge && badge.shown, JSON.stringify(badge));
  check('header: badge reads "Galerie"', badge?.label === 'Galerie', badge?.label);
  check('header: count chip hidden for a single image', badge?.countHidden === true);

  // ── 3. Gallery lightbox — open, upload, navigate, delete, sync ─────────
  await page.locator('[data-gallery-open]').click();
  await page.waitForSelector('.gallery', { timeout: 10000 });
  check('gallery: opens from the header photo', await page.locator('.gallery').count() > 0);
  check('gallery: chevrons hidden with a single image', !(await page.locator('.gallery__nav--next').isVisible()));
  check('gallery: thumbnail strip hidden with a single image', !(await page.locator('[data-gallery-thumbs]').isVisible()));

  const buf = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await page.locator('.gallery__file').setInputFiles([
    { name: 'innenansicht.png', mimeType: 'image/png', buffer: buf },
    { name: 'lageplan.png', mimeType: 'image/png', buffer: buf },
  ]);
  await page.waitForTimeout(300);
  const counter = (await page.locator('[data-gallery-counter]').textContent())?.trim();
  check('gallery: upload (FileReader) adds images', /\/\s*3$/.test(counter || ''), counter);
  check('gallery: thumbnail strip appears with multiple images', await page.locator('[data-gallery-thumbs]').isVisible());
  check('gallery: one thumbnail per image', await page.locator('.gallery__thumb').count() === 3);
  check('gallery: chevrons appear with multiple images', await page.locator('.gallery__nav--next').isVisible());

  const name1 = (await page.locator('[data-gallery-name]').textContent())?.trim();
  await page.locator('.gallery__nav--next').click();
  await page.waitForTimeout(60);
  const name2 = (await page.locator('[data-gallery-name]').textContent())?.trim();
  check('gallery: next chevron changes the image', name1 !== name2, `${name1} → ${name2}`);

  await page.screenshot({ path: join(OUT, 'media-viewer-gallery.png') });

  await page.locator('.gallery__btn[data-act="delete"]').click();
  await page.waitForTimeout(60);
  const counter2 = (await page.locator('[data-gallery-counter]').textContent())?.trim();
  check('gallery: delete removes the current image', /\/\s*2$/.test(counter2 || ''), counter2);

  await page.locator('.gallery__btn--close').click();
  await page.waitForTimeout(60);
  check('gallery: closes', await page.locator('.gallery').count() === 0);
  const chip = await page.evaluate(() => {
    const c = document.querySelector('.property-header__media-badge [data-gallery-count]');
    return c ? { text: c.textContent.trim(), hidden: c.hidden } : null;
  });
  check('header: badge count syncs after edits (2)', !!chip && chip.text === '2' && chip.hidden === false, JSON.stringify(chip));
}, async () => {
  await browser.close();
  server.close();
});
