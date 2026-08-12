import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { startServer, suppressPrototypeNotice } from './lib.mjs';

const outDir = join(process.cwd(), 'verify_out', 'a11y-responsive');
mkdirSync(outDir, { recursive: true });

const viewports = [
  { label: '320', width: 320, height: 760 },
  { label: '375', width: 375, height: 812 },
  { label: '768', width: 768, height: 900 },
  { label: '1024', width: 1024, height: 900 },
  { label: '1440', width: 1440, height: 900 }
];

const flows = [
  { label: 'public-start', hash: '#/', role: null },
  // Same URL as public-start but signed in: the front page then carries the
  // overview + services bands that used to live at #/home (merged this round).
  { label: 'front-signed-in', hash: '#/', role: 'LBO' },
  { label: 'properties-grid', hash: '#/properties', role: 'LBO' },
  { label: 'property-detail', hash: '#/properties/T-2010-AA-01', role: 'LBO' },
  { label: 'downloads', hash: '#/downloads', role: 'LBO' },
  { label: 'repair', hash: '#/repair', role: 'LBO' },
  { label: 'queue', hash: '#/queue', role: 'GS-Reviewer' },
  // A11Y-016: wizard, application detail and reviewer split used to escape
  // the sweep (h1 count / heading-jump checks never saw them).
  { label: 'wizard-step1', hash: '#/wizard/1', role: 'LBO' },
  { label: 'application-detail', hash: '#/inbox/BE-2026-014', role: 'LBO' },
  { label: 'review-split', hash: '#/review/BE-2026-014', role: 'GS-Reviewer' },
  // «Wissen und Hilfsmittel»: the overview and one topic page. Both are
  // public, and the topic page carries the TOC aside + accordion, the two
  // structures in this area most likely to break the heading outline.
  { label: 'info-overview', hash: '#/info', role: null },
  { label: 'info-faq', hash: '#/info/faq', role: null }
];

const failures = [];
const notices = [];

function addFailure(scope, message, details = {}) {
  failures.push({ scope, message, ...details });
}

function addNotice(scope, message, details = {}) {
  notices.push({ scope, message, ...details });
}

async function loginAs(page, baseUrl, role) {
  await page.goto(`${baseUrl}/#/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.portal?.acceptCookieConsent?.('necessary'));
  if (!role) return;
  await page.evaluate((nextRole) => window.t3lite.demoRole(nextRole), role);
  await page.waitForTimeout(350);
}

async function checkPage(page, scope) {
  const result = await page.evaluate(() => {
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const nameOf = (el) => {
      if (el.getAttribute('aria-hidden') === 'true') return 'hidden';
      if (el.getAttribute('aria-label')) return el.getAttribute('aria-label').trim();
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) {
        return labelledBy.split(/\s+/).map(id => document.getElementById(id)?.textContent?.trim() || '').join(' ').trim();
      }
      if ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) && el.labels?.length) {
        return Array.from(el.labels).map(label => label.textContent.trim()).join(' ').trim();
      }
      if (el instanceof HTMLImageElement) return el.alt || '';
      return el.textContent.trim();
    };
    const selector = [
      'a[href]',
      'button',
      'input:not([type="hidden"])',
      'select',
      'textarea',
      '[role="button"]',
      '[role="link"]',
      '[role="option"]'
    ].join(',');
    const interactive = Array.from(document.querySelectorAll(selector)).filter(visible);
    const missingNames = interactive
      .filter(el => !nameOf(el))
      .slice(0, 20)
      .map(el => ({
        tag: el.tagName.toLowerCase(),
        cls: el.className || '',
        href: el.getAttribute('href') || '',
        id: el.id || ''
      }));
    const smallTargets = interactive
      .filter(el => {
        // Exclusions: links in running text + footer, plus DOCUMENTED
        // WAIVERS (decision 2026-06, revisit for the MVP — note the 44 px
        // target size is WCAG 2.5.5/AAA; the portal commits to 2.1 AA):
        //  - CD Bund patterns whose canonical size is <44 px: top-bar
        //    utility links, header meta links, news dots/links,
        //    breadcrumb chevrons, `.btn--sm`, inline `.link` text links.
        //  - table content: ONLY genuinely row-clickable tables
        //    (.table--rows-clickable), where the row itself is the target
        //    and in-cell controls are secondary. A11Y-007: the previous
        //    blanket `table` waiver also hid the downloads table, whose
        //    rows are NOT clickable — its per-row download anchor is the
        //    sole affordance and must meet the target size.
        //  - MapLibre's own controls/attribution (third-party widget).
        //  - radio/checkbox inputs wrapped in a <label> — the label is
        //    the real tap target, the 18 px input is a false positive.
        if (el.closest('p, .rich-text, .footer__links, .app-footer__bottom, .top-bar, .top-header__meta, .news-section__dots, .breadcrumb, .table--rows-clickable, .maplibregl-ctrl, label')) return false;
        if (el.classList.contains('btn--sm') || el.classList.contains('link') || el.classList.contains('news-section__more')) return false;
        const r = el.getBoundingClientRect();
        return r.width < 44 || r.height < 44;
      })
      .slice(0, 20)
      .map(el => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          cls: el.className || '',
          text: nameOf(el).replace(/\s+/g, ' ').slice(0, 80),
          width: Math.round(r.width),
          height: Math.round(r.height)
        };
      });
    const images = Array.from(document.images).filter(visible);
    const imagesMissingAlt = images
      .filter(img => !img.hasAttribute('alt'))
      .map(img => img.currentSrc || img.src)
      .slice(0, 20);
    const imagesMissingLoading = images
      .filter(img => !img.closest('header') && !img.hasAttribute('loading'))
      .map(img => img.currentSrc || img.src)
      .slice(0, 20);
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).filter(visible)
      .map(h => ({ level: Number(h.tagName[1]), text: h.textContent.trim().slice(0, 100) }));
    const headingJumps = [];
    let previous = 0;
    for (const h of headings) {
      if (previous && h.level > previous + 1) headingJumps.push({ from: previous, to: h.level, text: h.text });
      previous = h.level;
    }
    const main = document.querySelector('main');
    const skip = document.querySelector('.skip-to-content[href="#main"]');
    const html = document.documentElement;
    return {
      url: location.href,
      lang: html.lang || '',
      landmarks: {
        header: !!document.querySelector('header'),
        nav: !!document.querySelector('nav'),
        main: !!main,
        footer: !!document.querySelector('footer')
      },
      skipTarget: !!skip && !!main && main.id === 'main',
      h1Count: headings.filter(h => h.level === 1).length,
      headingJumps,
      horizontalOverflow: {
        document: html.scrollWidth - html.clientWidth,
        body: document.body.scrollWidth - document.body.clientWidth,
        scrolling: (document.scrollingElement || html).scrollWidth - (document.scrollingElement || html).clientWidth
      },
      missingNames,
      smallTargets,
      imagesMissingAlt,
      imagesMissingLoading
    };
  });

  if (result.lang !== 'de') addFailure(scope, 'Document language is not de', { value: result.lang });
  for (const [landmark, ok] of Object.entries(result.landmarks)) {
    if (!ok) addFailure(scope, `Missing landmark: ${landmark}`);
  }
  if (!result.skipTarget) addFailure(scope, 'Skip link does not target main');
  if (result.h1Count !== 1) addFailure(scope, 'Expected exactly one visible h1', { count: result.h1Count });
  if (result.headingJumps.length) addFailure(scope, 'Heading level jump', { jumps: result.headingJumps.slice(0, 5) });
  if (result.horizontalOverflow.scrolling > 1) {
    addFailure(scope, 'Horizontal overflow detected', result.horizontalOverflow);
  }
  if (result.missingNames.length) addFailure(scope, 'Visible interactive controls without accessible names', { controls: result.missingNames });
  if (result.imagesMissingAlt.length) addFailure(scope, 'Visible images without alt attribute', { images: result.imagesMissingAlt });
  if (result.imagesMissingLoading.length) addNotice(scope, 'Visible non-header images without loading attribute', { images: result.imagesMissingLoading });
  if (result.smallTargets.length) addNotice(scope, 'Interactive targets below 44x44 outside rich text/footer', { targets: result.smallTargets });
  return result;
}

async function checkMobileMenu(page, scope) {
  const burger = page.locator('.burger').first();
  if (await burger.count() === 0 || !(await burger.isVisible())) return;
  await burger.click();
  await page.waitForTimeout(150);
  const opened = await page.evaluate(() => {
    const nav = document.getElementById('mainNavigation');
    const burger = document.querySelector('.burger');
    return {
      open: nav?.classList.contains('open') || false,
      expanded: burger?.getAttribute('aria-expanded') || '',
      activeInside: !!document.activeElement?.closest?.('#mainNavigation'),
      bodyLocked: document.body.classList.contains('body--mobile-menu-is-open')
    };
  });
  if (!opened.open || opened.expanded !== 'true' || !opened.bodyLocked) {
    addFailure(scope, 'Mobile menu did not expose open state correctly', opened);
  }
  if (!opened.activeInside) addFailure(scope, 'Mobile menu did not move focus inside menu', opened);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  const closed = await page.evaluate(() => {
    const nav = document.getElementById('mainNavigation');
    const burger = document.querySelector('.burger');
    return {
      open: nav?.classList.contains('open') || false,
      expanded: burger?.getAttribute('aria-expanded') || '',
      focusRestored: document.activeElement === burger,
      bodyLocked: document.body.classList.contains('body--mobile-menu-is-open')
    };
  });
  if (closed.open || closed.expanded !== 'false' || closed.bodyLocked || !closed.focusRestored) {
    addFailure(scope, 'Mobile menu did not close and restore focus correctly', closed);
  }
}

async function checkRoleModal(page, scope) {
  const trigger = page.locator('.top-bar__link--user').first();
  if (await trigger.count() === 0 || !(await trigger.isVisible())) return;
  await trigger.focus();
  await page.evaluate(() => window.portal.openRoleMenu());
  await page.waitForTimeout(120);
  const modalState = await page.evaluate(() => {
    const dialog = Array.from(document.querySelectorAll('[role="dialog"][aria-modal="true"]'))
      .find(el => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
      });
    return {
      present: !!dialog,
      labelled: !!dialog?.getAttribute('aria-labelledby'),
      focusInside: !!document.activeElement?.closest?.('[role="dialog"]')
    };
  });
  if (!modalState.present || !modalState.labelled || !modalState.focusInside) {
    addFailure(scope, 'Role modal is not correctly announced or focused', modalState);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(120);
  const closed = await page.evaluate(() => ({
    present: Array.from(document.querySelectorAll('[role="dialog"][aria-modal="true"]'))
      .some(el => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
      }),
    focusReturned: !!document.activeElement?.closest?.('.top-bar__link--user')
  }));
  if (closed.present || !closed.focusReturned) {
    addFailure(scope, 'Role modal did not close and restore focus', closed);
  }
}

const { server, baseUrl } = await startServer();
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    for (const flow of flows) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        reducedMotion: 'reduce'
      });
      // The prototype disclaimer gets its own a11y coverage in
      // check-prototype-notice.mjs; suppress it here so the sweep measures the
      // steady-state page rather than a first-visit one.
      await suppressPrototypeNotice(context);
      const page = await context.newPage();
      const scope = `${flow.label}@${viewport.label}`;
      page.on('pageerror', err => addFailure(scope, 'Page error', { error: err.message }));
      page.on('console', msg => {
        if (msg.type() === 'error') addNotice(scope, 'Console error', { text: msg.text() });
      });
      await loginAs(page, baseUrl, flow.role);
      await page.goto(`${baseUrl}/${flow.hash}`, { waitUntil: 'networkidle' });
      await page.evaluate(() => window.portal?.acceptCookieConsent?.('necessary'));
      await page.waitForTimeout(350);
      await checkPage(page, scope);
      if (viewport.width < 1024 && flow.label === 'home') await checkMobileMenu(page, scope);
      if (viewport.width >= 1024 && flow.label === 'home') await checkRoleModal(page, scope);
      if (['home', 'property-detail', 'downloads'].includes(flow.label)) {
        await page.screenshot({ path: join(outDir, `${scope}.png`), fullPage: false });
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}

const report = {
  checkedAt: new Date().toISOString(),
  viewports,
  flows,
  failureCount: failures.length,
  noticeCount: notices.length,
  failures,
  notices
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
