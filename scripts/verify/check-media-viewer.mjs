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
