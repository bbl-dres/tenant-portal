// Design-review baseline capture (round 2, designsystem v1.0.45).
//
// Captures, for every route × viewport width:
//   1. a full-page screenshot                          → <out>/<role>/<target>/w<width>.png
//   2. a whole-DOM computed-style hash dump            → <out>/<role>/<target>/w<width>.hashes.json
//      (one FNV-1a hash per element + ::before/::after, in document order —
//      the instrument that proves the Phase B CSS split is visually neutral)
//   3. full getComputedStyle dumps for a curated probe
//      set at selected widths                          → <out>/<role>/<target>/w<width>.probes.json
// plus a bounded set of interactive states at 1280/360 px and a mobile-
// emulation pass (touch + Android UA) at 360/390 px.
//
// Usage: node scripts/review/capture-baseline.mjs [outDir]
// Default outDir: verify_out/design-review/baseline
// A manifest.json at the root records every capture with an aggregate hash.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import process from 'node:process';
import { startServer, suppressPrototypeNotice } from '../verify/lib.mjs';

const OUT = process.argv[2] || join('verify_out', 'design-review', 'baseline');
// REVIEW_WIDTHS=1280,360 node … — subset override for smoke runs.
const WIDTHS = process.env.REVIEW_WIDTHS
  ? process.env.REVIEW_WIDTHS.split(',').map(Number)
  : [320, 360, 390, 480, 640, 768, 1024, 1280, 1544, 1920];
const PROBE_WIDTHS = new Set([360, 768, 1280, 1920]);
const VIEW_H = 900;
const MOBILE_WIDTHS = [360, 390];
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';

// Routes per role. `pick` runs in-page and may derive the hash from state.
const TARGETS = [
  { role: null, id: 'landing', hash: '#/' },
  { role: null, id: 'login', hash: '#/login' },
  { role: null, id: 'info', hash: '#/info' },
  // Login-gate pages: protected routes visited while logged out render the
  // central gate (renderLoginGate) instead of auto-logging in.
  { role: null, id: 'gate-inbox', hash: '#/inbox' },
  { role: null, id: 'gate-properties', hash: '#/properties' },
  { role: null, id: 'gate-wizard', hash: '#/wizard/1' },
  { role: 'LBO', id: 'home', hash: '#/home' },
  { role: 'LBO', id: 'wizard-1', hash: '#/wizard/1' },
  { role: 'LBO', id: 'wizard-2', hash: '#/wizard/2' },
  { role: 'LBO', id: 'wizard-3', hash: '#/wizard/3' },
  { role: 'LBO', id: 'wizard-4', hash: '#/wizard/4' },
  { role: 'LBO', id: 'wizard-5', hash: '#/wizard/5' },
  { role: 'LBO', id: 'inbox', hash: '#/inbox' },
  { role: 'LBO', id: 'inbox-detail', pick: 'inboxDetail' },
  { role: 'LBO', id: 'properties-gallery', hash: '#/properties' },
  { role: 'LBO', id: 'properties-list', hash: '#/properties?view=list' },
  { role: 'LBO', id: 'properties-map', hash: '#/properties?view=map', pixelVolatile: true },
  { role: 'LBO', id: 'property-detail', pick: 'propertyDetail', pixelVolatile: true },
  { role: 'LBO', id: 'floor-detail', pick: 'floorDetail', pixelVolatile: true },
  { role: 'LBO', id: 'downloads', hash: '#/downloads' },
  { role: 'LBO', id: 'repair', hash: '#/repair' },
  { role: 'LBO', id: 'profile', hash: '#/profile' },
  { role: 'LBO', id: 'news', hash: '#/news' },
  { role: 'LBO', id: 'news-detail', pick: 'newsDetail' },
  { role: 'LBO', id: 'services', hash: '#/services' },
  { role: 'LBO', id: 'moves', hash: '#/moves' },
  { role: 'LBO', id: 'cleaning', hash: '#/cleaning' },
  { role: 'LBO', id: 'mobiliar', hash: '#/mobiliar' },
  { role: 'LBO', id: 'search', hash: '#/search?q=bern' },
  { role: 'LBO', id: 'not-found', hash: '#/definitely-not-a-route' },
  { role: 'GS-Reviewer', id: 'home-gs', hash: '#/home' },
  { role: 'GS-Reviewer', id: 'queue', hash: '#/queue' },
  { role: 'GS-Reviewer', id: 'review-detail', pick: 'reviewDetail' },
  { role: 'BBL-PFM', id: 'home-pfm', hash: '#/home' },
  { role: 'BBL-Campus', id: 'home-campus', hash: '#/home' },
  { role: 'Auditor', id: 'home-auditor', hash: '#/home' },
];

// In-page hash pickers (run with window.portal.state available).
const PICKERS = {
  inboxDetail: () => {
    const s = window.portal.state;
    const mine = s.applications.find(a => a.ve === s.user.ve) || s.applications[0];
    return mine ? '#/inbox/' + mine.id : null;
  },
  propertyDetail: () => {
    const s = window.portal.state;
    return s.tenancies.length ? '#/properties/' + s.tenancies[0].id : null;
  },
  newsDetail: () => {
    const s = window.portal.state;
    return s.news.length ? '#/news/' + s.news[0].id : null;
  },
  floorDetail: () => {
    // Runs right after property-detail was rendered — floor rows render as
    // <tr onclick="location.hash='#/properties/…/floors/…'"> (app.js:2856),
    // with anchor variants on some views. Try both shapes.
    const a = document.querySelector('a[href*="/floors/"]');
    if (a) return a.getAttribute('href');
    const tr = document.querySelector('[onclick*="/floors/"]');
    if (!tr) return null;
    const m = (tr.getAttribute('onclick') || '').match(/#\/properties\/[^']+\/floors\/[^'&]+/);
    return m ? m[0] : null;
  },
  reviewDetail: () => {
    const s = window.portal.state;
    const a = s.applications.find(x => /pr(ü|u)f|eingereicht|review/i.test(x.status || '')) || s.applications[0];
    return a ? '#/review/' + a.id : null;
  },
};

// Curated computed-style probes: {sel, on} — dumped when the current target
// id matches `on`. Missing selectors are recorded as absent, not failures.
const PROBES = [
  { sel: '.top-bar', on: 'home' },
  { sel: '.top-bar__lang', on: 'home' },
  { sel: '.top-header', on: 'home' },
  { sel: '.top-header .logo, .top-header__logo', on: 'home' },
  { sel: '.navbar', on: 'home' },
  { sel: '.navbar a, .navbar button', on: 'home' },
  { sel: '.breadcrumb', on: 'inbox' },
  { sel: '.skip-to-content', on: 'home' },
  { sel: 'footer, .footer, .app-footer', on: 'home' },
  { sel: '.btn--filled', on: 'home' },
  { sel: '.btn--outline', on: 'inbox' },
  { sel: '.btn--bare', on: 'inbox' },
  { sel: '.card', on: 'home' },
  { sel: '.card__title', on: 'home' },
  { sel: '.card--quick', on: 'home' },
  { sel: '.badge', on: 'inbox' },
  { sel: '.tag-item', on: 'inbox' },
  { sel: '.form-field', on: 'wizard-1' },
  { sel: '.form-field input, .input', on: 'wizard-1' },
  { sel: 'select', on: 'wizard-1' },
  { sel: 'input[type="checkbox"]', on: 'wizard-2' },
  { sel: 'input[type="radio"]', on: 'wizard-2' },
  { sel: '.table', on: 'inbox' },
  { sel: '.table th', on: 'inbox' },
  { sel: '.table td', on: 'inbox' },
  { sel: '.pagination', on: 'downloads' },
  { sel: '.step-indicator, .steps', on: 'wizard-1' },
  { sel: '.pipeline', on: 'inbox-detail' },
  { sel: '.tab, [role="tab"]', on: 'inbox-detail' },
  { sel: '.accordion', on: 'info' },
  { sel: '.hero', on: 'landing' },
  { sel: '.section-heading', on: 'home' },
  { sel: 'h1, .h1', on: 'home' },
  { sel: '.meta-info', on: 'news-detail' },
  { sel: '.search-field', on: 'downloads' },
  { sel: '.notification-banner', on: 'landing' },
  { sel: '.view-toggle, .segmented, [role="tablist"]', on: 'properties-gallery' },
  { sel: '.queue-toolbar, .bulk-bar', on: 'queue' },
  { sel: '.language-switcher', on: 'home' },
  { sel: '.back-to-top-btn, .back-to-top-wrapper', on: 'info' },
];

// Whole-DOM computed-style hash — runs in the page. One record per element
// in document order: tag, class, hash(main), hash(::before), hash(::after).
// Hasher v2: custom properties (--*) are EXCLUDED from per-element hashes —
// they are inherited strings, so one token whose text changes (e.g. a
// url('../…') path after a file move) would otherwise mark every element as
// different while rendering identically. Their visual effects surface in the
// longhand properties that consume them. The root token SET is still
// compared, as a dedicated first record (i:-1) with url(../) paths
// normalised, so genuine token additions/removals/value changes are caught.
function domHashScript() {
  const SKIP = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'NOSCRIPT']);
  const fnv = (str) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16);
  };
  // v3: computed values embedding absolute URLs (mask-image, background-
  // image, …) carry the capture server's random port — strip the origin so
  // two runs are comparable. Custom-prop enumeration order follows cascade
  // order, so the root-token record sorts names before hashing.
  const origin = location.origin;
  const clean = (v) => v.split(origin).join('');
  const styleString = (cs) => {
    let s = '';
    for (let i = 0; i < cs.length; i++) {
      const p = cs[i];
      if (p.startsWith('--')) continue;
      s += p + ':' + clean(cs.getPropertyValue(p)) + ';';
    }
    return s;
  };
  const out = [];
  {
    const rootCs = getComputedStyle(document.documentElement);
    const names = [];
    for (let i = 0; i < rootCs.length; i++) {
      if (rootCs[i].startsWith('--')) names.push(rootCs[i]);
    }
    names.sort();
    let tokens = '';
    for (const p of names) {
      tokens += p + ':' + clean(rootCs.getPropertyValue(p)).replace(/(\.\.\/)+/g, '') + ';';
    }
    out.push({ i: -1, t: ':root-tokens', c: '', h: fnv(tokens), hb: '0', ha: '0' });
  }
  const els = document.querySelectorAll('*');
  let idx = 0;
  for (const el of els) {
    if (SKIP.has(el.tagName)) continue;
    const cls = typeof el.className === 'string' ? el.className : (el.className && el.className.baseVal) || '';
    const rec = {
      i: idx++,
      t: el.tagName.toLowerCase(),
      c: cls,
      h: fnv(styleString(getComputedStyle(el))),
      hb: fnv(styleString(getComputedStyle(el, '::before'))),
      ha: fnv(styleString(getComputedStyle(el, '::after'))),
    };
    out.push(rec);
  }
  return out;
}

function probeScript(probes) {
  const dump = (el) => {
    const cs = getComputedStyle(el);
    const o = {};
    for (let i = 0; i < cs.length; i++) {
      const p = cs[i];
      o[p] = cs.getPropertyValue(p);
    }
    return o;
  };
  return probes.map(({ sel }) => {
    let el = null;
    try { el = document.querySelector(sel); } catch { /* bad selector */ }
    if (!el) return { sel, found: false };
    const cls = typeof el.className === 'string' ? el.className : (el.className && el.className.baseVal) || '';
    return { sel, found: true, tag: el.tagName.toLowerCase(), cls, style: dump(el) };
  });
}

const manifest = [];

function aggregate(hashes) {
  let s = '';
  for (const r of hashes) s += r.h + r.hb + r.ha;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

function save(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data));
}

async function settle(page) {
  // Remove transient toasts (login confirmation etc.) — harness-only cleanup.
  await page.evaluate(() => {
    document.querySelectorAll('.toast-host .toast, .toast').forEach(t => t.remove());
  });
  await page.evaluate(() => document.fonts && document.fonts.ready);
}

async function gotoTarget(page, baseUrl, target) {
  let hash = target.hash;
  if (target.pick) {
    hash = await page.evaluate(PICKERS[target.pick]);
    if (!hash) return null;
  }
  // The router stamps the handled PATH (query stripped) onto #page-body after
  // each render. Blank the stamp first, then wait for it to reappear — this
  // works for path changes, query-only changes, and redirecting handlers alike.
  await page.evaluate(() => {
    const b = document.getElementById('page-body');
    if (b) b.dataset.route = '';
  });
  await page.evaluate((h) => { window.portal.navigate(h); }, hash);
  await page.waitForFunction(
    () => {
      const b = document.getElementById('page-body');
      return !!(b && b.dataset.route);
    },
    undefined,
    { timeout: 15000 },
  );
  await page.waitForTimeout(target.pixelVolatile ? 2500 : 400);
  // Embedded MapLibre surfaces (properties map, property-detail mini-map,
  // floor plan) show a .map-loading placeholder until init completes —
  // capturing mid-init makes the DOM (and thus the hash dump) racy.
  await page.waitForFunction(
    () => !document.querySelector('.map-loading'),
    undefined,
    { timeout: 10000 },
  ).catch(() => {});
  await settle(page);
  const rendered = await page.evaluate(() => document.getElementById('page-body').dataset.route);
  return { requested: hash, rendered };
}

async function capture(page, dir, name, target, width, probesWanted) {
  const hashes = await page.evaluate(domHashScript);
  save(join(dir, `w${width}.hashes.json`), hashes);
  if (probesWanted) {
    const probes = PROBES.filter(p => p.on === target.id);
    if (probes.length) {
      const res = await page.evaluate(probeScript, probes);
      save(join(dir, `w${width}.probes.json`), res);
    }
  }
  await page.screenshot({ path: join(dir, `w${width}.png`), fullPage: true });
  return aggregate(hashes);
}

async function loginRole(page, role) {
  if (!role) return;
  await page.evaluate((r) => window.t3lite.demoRole(r), role);
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    document.querySelectorAll('.toast-host .toast, .toast').forEach(t => t.remove());
  });
}

async function runPass(browser, baseUrl, widths, mobile) {
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: VIEW_H },
      reducedMotion: 'reduce',
      ...(mobile ? { hasTouch: true, isMobile: true, userAgent: MOBILE_UA } : {}),
    });
    await suppressPrototypeNotice(context);
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200));
    });
    page.on('pageerror', (err) => consoleErrors.push(String(err).slice(0, 200)));
    await page.goto(`${baseUrl}/#/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.portal.dismissPrototypeNotice && window.portal.dismissPrototypeNotice());
    await page.evaluate(() => window.portal.acceptCookieConsent && window.portal.acceptCookieConsent('necessary'));

    const only = process.env.REVIEW_TARGETS ? new Set(process.env.REVIEW_TARGETS.split(',')) : null;
    let currentRole = null;
    for (const target of TARGETS) {
      if (only && !only.has(target.id) && !(target.pick && only.has(target.id))) {
        // Still perform role switches so filtered targets get the right user.
        if (target.role !== currentRole) {
          if (target.role) await loginRole(page, target.role);
          currentRole = target.role;
        }
        continue;
      }
      if (target.role !== currentRole) {
        if (target.role) await loginRole(page, target.role);
        currentRole = target.role;
      }
      const roleDir = mobile ? `mobile-${target.role || 'public'}` : (target.role || 'public');
      const dir = join(OUT, roleDir, target.id);
      try {
        const nav = await gotoTarget(page, baseUrl, target);
        if (!nav) {
          manifest.push({ role: roleDir, target: target.id, width, ok: false, note: 'picker returned null' });
          continue;
        }
        const agg = await capture(page, dir, target.id, target, width, !mobile && PROBE_WIDTHS.has(width));
        const errs = consoleErrors.splice(0);
        manifest.push({
          role: roleDir, target: target.id, width, ok: true, agg,
          requested: nav.requested, rendered: nav.rendered,
          ...(errs.length ? { consoleErrors: errs } : {}),
          ...(target.pixelVolatile ? { pixelVolatile: true } : {}),
        });
        if (errs.length) console.log(`     console errors on ${roleDir}/${target.id} @${width}: ${errs.length}`);
        console.log(`ok   ${roleDir}/${target.id} @${width}${mobile ? ' (mobile)' : ''} ${agg}`);
      } catch (err) {
        manifest.push({ role: roleDir, target: target.id, width, ok: false, note: String(err && err.message || err).split('\n')[0] });
        console.log(`FAIL ${roleDir}/${target.id} @${width} — ${String(err && err.message || err).split('\n')[0]}`);
      }
    }
    await context.close();
  }
}

// Interactive states — best effort; every attempt is recorded either way.
const STATES = [
  { id: 'state-nav-dropdown', role: 'LBO', base: '#/home', widths: [1280], act: async (page) => {
    await page.click('.navbar button[aria-expanded], .navbar [aria-haspopup]');
    await page.waitForTimeout(400);
  } },
  { id: 'state-burger-open', role: 'LBO', base: '#/home', widths: [360], act: async (page) => {
    await page.click('.burger, [class*="burger"]');
    await page.waitForTimeout(500);
  } },
  { id: 'state-lang-open', role: 'LBO', base: '#/home', widths: [1280], act: async (page) => {
    await page.evaluate(() => window.portal.toggleLang());
    await page.waitForTimeout(300);
  } },
  { id: 'state-search-open', role: 'LBO', base: '#/home', widths: [1280, 360], act: async (page) => {
    await page.evaluate(() => window.portal.toggleSearch(true));
    await page.waitForTimeout(300);
  } },
  { id: 'state-shortcut-overlay', role: 'LBO', base: '#/home', widths: [1280, 360], act: async (page) => {
    await page.keyboard.press('?');
    await page.waitForTimeout(400);
  } },
  { id: 'state-accordion-open', role: 'LBO', base: '#/info/faq', widths: [1280, 360], act: async (page) => {
    await page.click('.accordion button, .accordion__toggle, [aria-expanded="false"]');
    await page.waitForTimeout(400);
  } },
  { id: 'state-chip-selected', role: 'LBO', base: '#/inbox', widths: [1280, 360], act: async (page) => {
    await page.click('.tag-item, [class*="chip"]');
    await page.waitForTimeout(400);
  } },
  { id: 'state-focus-visible', role: 'LBO', base: '#/home', widths: [1280, 360], act: async (page) => {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
  } },
  { id: 'state-bulk-approve-modal', role: 'GS-Reviewer', base: '#/queue', widths: [1280, 360], act: async (page) => {
    await page.click('thead input[type="checkbox"]');
    await page.waitForTimeout(200);
    await page.click('button:has-text("enehmig")');
    await page.waitForTimeout(400);
  } },
];

async function runStates(browser, baseUrl) {
  for (const st of STATES) {
    for (const width of st.widths) {
      const context = await browser.newContext({ viewport: { width, height: VIEW_H }, reducedMotion: 'reduce' });
      await suppressPrototypeNotice(context);
      const page = await context.newPage();
      try {
        await page.goto(`${baseUrl}/#/`, { waitUntil: 'networkidle' });
        await page.evaluate(() => window.portal.dismissPrototypeNotice && window.portal.dismissPrototypeNotice());
        await page.evaluate(() => window.portal.acceptCookieConsent && window.portal.acceptCookieConsent('necessary'));
        await loginRole(page, st.role);
        await page.evaluate((h) => window.portal.navigate(h), st.base);
        await page.waitForTimeout(600);
        await settle(page);
        await st.act(page);
        const dir = join(OUT, 'states', st.id);
        const hashes = await page.evaluate(domHashScript);
        save(join(dir, `w${width}.hashes.json`), hashes);
        await page.screenshot({ path: join(dir, `w${width}.png`), fullPage: true });
        manifest.push({ role: 'states', target: st.id, width, ok: true, agg: aggregate(hashes) });
        console.log(`ok   states/${st.id} @${width}`);
      } catch (err) {
        manifest.push({ role: 'states', target: st.id, width, ok: false, note: String(err && err.message || err).split('\n')[0] });
        console.log(`FAIL states/${st.id} @${width} — ${String(err && err.message || err).split('\n')[0]}`);
      }
      await context.close();
    }
  }
  // First-visit banners: fresh context, no suppression.
  for (const width of [1280, 360]) {
    const context = await browser.newContext({ viewport: { width, height: VIEW_H }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      await page.goto(`${baseUrl}/#/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      await page.evaluate(() => document.fonts && document.fonts.ready);
      const dir = join(OUT, 'states', 'state-first-visit-banners');
      const hashes = await page.evaluate(domHashScript);
      save(join(dir, `w${width}.hashes.json`), hashes);
      await page.screenshot({ path: join(dir, `w${width}.png`), fullPage: true });
      manifest.push({ role: 'states', target: 'state-first-visit-banners', width, ok: true, agg: aggregate(hashes) });
      console.log(`ok   states/state-first-visit-banners @${width}`);
    } catch (err) {
      manifest.push({ role: 'states', target: 'state-first-visit-banners', width, ok: false, note: String(err && err.message || err).split('\n')[0] });
    }
    await context.close();
  }
}

const { server, baseUrl } = await startServer();
const browser = await chromium.launch();
try {
  await runPass(browser, baseUrl, WIDTHS, false);
  if (!process.env.REVIEW_WIDTHS) {
    await runPass(browser, baseUrl, MOBILE_WIDTHS, true);
    if (!process.env.REVIEW_TARGETS) await runStates(browser, baseUrl);
  }
} finally {
  await browser.close();
  server.close();
  const manifestName = process.env.REVIEW_TARGETS ? 'manifest-supplement.json' : 'manifest.json';
  save(join(OUT, manifestName), JSON.stringify(manifest, null, 1));
  const failed = manifest.filter(m => !m.ok);
  console.log(`\nBaseline capture: ${manifest.length - failed.length}/${manifest.length} captures ok, out: ${OUT}`);
  if (failed.length) {
    console.log('Failed/skipped captures:');
    failed.forEach(f => console.log(`- ${f.role}/${f.target} @${f.width}: ${f.note}`));
  }
}
