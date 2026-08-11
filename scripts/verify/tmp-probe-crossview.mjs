// Cross-view systems probe: badges, formatting, empty/error states, icons, toasts.
import { chromium } from 'playwright';
import { startServer, loginAs, waitForRoute, suppressPrototypeNotice } from './lib.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.env.OUT_DIR;
mkdirSync(OUT, { recursive: true });

const { server, baseUrl } = await startServer();
const browser = await chromium.launch();

function log(...a) { console.log(...a); }

async function collect(page, label) {
  const data = await page.evaluate(() => {
    const badges = Array.from(document.querySelectorAll('.badge')).map(b => ({
      text: b.textContent.trim(),
      cls: b.className,
      rect: (r => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }))(b.getBoundingClientRect()),
      fs: getComputedStyle(b).fontSize,
      bg: getComputedStyle(b).backgroundColor,
    }));
    const icons = Array.from(document.querySelectorAll('svg.inline-icon use')).map(u => u.getAttribute('href'));
    const iconCount = {};
    icons.forEach(h => { const n = (h || '').split('/').pop().replace('.svg', ''); iconCount[n] = (iconCount[n] || 0) + 1; });
    return { badges, iconCount };
  });
  log(`\n=== ${label} ===`);
  log('badges:', JSON.stringify(data.badges, null, 1));
  log('icons:', JSON.stringify(data.iconCount));
  return data;
}

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await suppressPrototypeNotice(page);
await loginAs(page, baseUrl, 'LBO');
await page.evaluate(() => window.portal.acceptCookieConsent?.('necessary'));

// 1. Inbox
await page.goto(`${baseUrl}/#/inbox`); await waitForRoute(page, '#/inbox');
await collect(page, 'INBOX 1280 (LBO)');
await page.screenshot({ path: join(OUT, 'inbox-1280.png'), fullPage: true });
// date + status cell text per row
const inboxRows = await page.evaluate(() => Array.from(document.querySelectorAll('tbody tr')).map(tr =>
  Array.from(tr.cells).map(c => c.textContent.trim().slice(0, 40))));
log('inbox rows:', JSON.stringify(inboxRows, null, 1));

// 2. Application detail — clarification
await page.goto(`${baseUrl}/#/inbox/Z-7-204`); await waitForRoute(page, '#/inbox/Z-7-204');
await collect(page, 'DETAIL Z-7-204 (clarification)');
await page.screenshot({ path: join(OUT, 'detail-clarification-1280.png'), fullPage: true });

// 3. Detail approved + areas formatting
await page.goto(`${baseUrl}/#/inbox/UVEK-2026-002`); await waitForRoute(page, '#/inbox/UVEK-2026-002');
const areaTexts = await page.evaluate(() => Array.from(document.querySelectorAll('.card__inset, td, dd'))
  .map(e => e.textContent).filter(t => t.includes('m²')).map(t => t.trim().replace(/\s+/g, ' ').slice(0, 120)));
log('detail area texts:', JSON.stringify(areaTexts, null, 1));

// 4. Home (LBO) area lead
await page.goto(`${baseUrl}/#/home`); await waitForRoute(page, '#/home');
const homeAreas = await page.evaluate(() => Array.from(document.querySelectorAll('*')).filter(e => e.children.length === 0 && /m²/.test(e.textContent)).map(e => e.textContent.trim().slice(0, 80)));
log('home area texts:', JSON.stringify(homeAreas.slice(0, 10), null, 1));
await page.screenshot({ path: join(OUT, 'home-1280.png'), fullPage: true });

// 5. Properties cards + list
await page.goto(`${baseUrl}/#/properties?view=cards`); await waitForRoute(page, '#/properties');
await page.waitForTimeout(400);
await collect(page, 'PROPERTIES CARDS 1280');
const cardAreas = await page.evaluate(() => Array.from(document.querySelectorAll('.card--property'))
  .slice(0, 4).map(c => c.textContent.replace(/\s+/g, ' ').trim().slice(0, 160)));
log('property cards:', JSON.stringify(cardAreas, null, 1));
await page.screenshot({ path: join(OUT, 'properties-cards-1280.png'), fullPage: true });

await page.goto(`${baseUrl}/#/properties?view=list`); await waitForRoute(page, '#/properties');
await page.waitForTimeout(300);
const listRows = await page.evaluate(() => Array.from(document.querySelectorAll('tbody tr')).slice(0, 5).map(tr =>
  Array.from(tr.cells).map(c => c.textContent.trim().slice(0, 30))));
log('properties list rows:', JSON.stringify(listRows, null, 1));
await page.screenshot({ path: join(OUT, 'properties-list-1280.png'), fullPage: true });

// 6. Property detail T-2011 (hnf2 5840)
await page.goto(`${baseUrl}/#/properties/T-2011-AA-01`); await waitForRoute(page, '#/properties/T-2011-AA-01');
await page.waitForTimeout(400);
const statVals = await page.evaluate(() => Array.from(document.querySelectorAll('.property-stats__value, .property-header__meta, .floor-list__num'))
  .map(e => e.textContent.trim().replace(/\s+/g, ' ')));
log('property detail stats:', JSON.stringify(statVals, null, 1));
await collect(page, 'PROPERTY DETAIL 1280');
await page.screenshot({ path: join(OUT, 'property-detail-1280.png'), fullPage: true });

// 7. Queue as GS-Reviewer
await page.evaluate(() => window.t3lite.demoRole('GS-Reviewer'));
await page.waitForTimeout(400);
await page.goto(`${baseUrl}/#/queue`); await waitForRoute(page, '#/queue');
await collect(page, 'QUEUE 1280 (GS)');
const queueRows = await page.evaluate(() => Array.from(document.querySelectorAll('tbody tr')).map(tr =>
  Array.from(tr.cells).map(c => c.textContent.trim().slice(0, 30))));
log('queue rows:', JSON.stringify(queueRows, null, 1));
await page.screenshot({ path: join(OUT, 'queue-1280.png'), fullPage: true });

// 8. 404 + entity-not-found states
await page.goto(`${baseUrl}/#/definitely-not-a-route`);
await page.waitForTimeout(400);
const nf = await page.evaluate(() => ({
  html: document.getElementById('page-body')?.innerHTML.slice(0, 500),
  breadcrumb: document.querySelector('.breadcrumb')?.textContent.trim().replace(/\s+/g, ' '),
}));
log('404 state:', JSON.stringify(nf, null, 1));
await page.screenshot({ path: join(OUT, 'route-404-1280.png'), fullPage: true });

await page.goto(`${baseUrl}/#/inbox/DOES-NOT-EXIST`);
await page.waitForTimeout(400);
const nfApp = await page.evaluate(() => ({
  pageBody: document.getElementById('page-body')?.innerHTML.slice(0, 400),
  breadcrumb: document.querySelector('.breadcrumb')?.textContent.trim().replace(/\s+/g, ' '),
  route: document.getElementById('page-body')?.dataset.route,
}));
log('app-not-found state:', JSON.stringify(nfApp, null, 1));
await page.screenshot({ path: join(OUT, 'app-not-found-1280.png'), fullPage: true });

await page.goto(`${baseUrl}/#/news/bogus-id`);
await page.waitForTimeout(400);
const nfNews = await page.evaluate(() => ({
  pageBody: document.getElementById('page-body')?.innerHTML.slice(0, 400),
  breadcrumb: document.querySelector('.breadcrumb')?.textContent.trim().replace(/\s+/g, ' '),
}));
log('news-not-found state:', JSON.stringify(nfNews, null, 1));
await page.screenshot({ path: join(OUT, 'news-not-found-1280.png'), fullPage: true });

// 9. Empty filter states
await page.goto(`${baseUrl}/#/inbox?q=zzzzz`);
await page.waitForTimeout(400);
const emptyInbox = await page.evaluate(() => document.querySelector('.table-empty, .empty-state')?.outerHTML.slice(0, 300));
log('inbox empty filter:', emptyInbox);
await page.goto(`${baseUrl}/#/downloads?q=zzzzz`);
await page.waitForTimeout(500);
const emptyDl = await page.evaluate(() => {
  const inp = document.querySelector('input[type="search"], .downloads-filter input');
  return { hasInput: !!inp, cell: document.querySelector('.table-empty')?.textContent };
});
log('downloads empty:', JSON.stringify(emptyDl));

// 10. Toasts — neutral validation vs success, computed styles
await page.goto(`${baseUrl}/#/repair`); await waitForRoute(page, '#/repair');
await page.evaluate(() => { window.portal.toast('Bitte Liegenschaft wählen.'); window.portal.toast('Schadensmeldung R-2026-482 an BBL Objektmanagement gesendet (objektmanagement@bbl.admin.ch).', 'success'); });
await page.waitForTimeout(300);
const toasts = await page.evaluate(() => Array.from(document.querySelectorAll('.toast')).map(t => ({
  text: t.textContent.trim().slice(0, 120),
  cls: t.className,
  role: t.getAttribute('role'),
  bg: getComputedStyle(t).backgroundColor,
  color: getComputedStyle(t).color,
  icon: t.querySelector('.toast__icon use')?.getAttribute('href'),
  rect: (r => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }))(t.getBoundingClientRect()),
})));
log('toasts:', JSON.stringify(toasts, null, 1));
await page.screenshot({ path: join(OUT, 'toasts-1280.png') });

// 11. 360 checks
const m = await browser.newPage({ viewport: { width: 360, height: 780 } });
await suppressPrototypeNotice(m);
await loginAs(m, baseUrl, 'LBO');
await m.goto(`${baseUrl}/#/inbox/Z-7-204`); await waitForRoute(m, '#/inbox/Z-7-204');
const pip = await m.evaluate(() => {
  const p = document.querySelector('.pipeline');
  return p ? { scrollW: p.scrollWidth, clientW: p.clientWidth, fs: getComputedStyle(p).fontSize } : null;
});
log('pipeline 360:', JSON.stringify(pip));
await m.screenshot({ path: join(OUT, 'detail-360.png'), fullPage: true });
await m.goto(`${baseUrl}/#/properties?view=cards`); await waitForRoute(m, '#/properties');
await m.waitForTimeout(400);
await m.screenshot({ path: join(OUT, 'properties-cards-360.png'), fullPage: true });
await m.evaluate(() => window.portal.toast('Schadensmeldung R-2026-482 an BBL Objektmanagement gesendet (objektmanagement@bbl.admin.ch).', 'success'));
await m.waitForTimeout(250);
const toast360 = await m.evaluate(() => {
  const t = document.querySelector('.toast');
  return t ? { w: Math.round(t.getBoundingClientRect().width), lines: Math.round(t.getBoundingClientRect().height) } : null;
});
log('toast 360:', JSON.stringify(toast360));
await m.screenshot({ path: join(OUT, 'toast-360.png') });

await browser.close();
server.close();
log('\nDONE');
