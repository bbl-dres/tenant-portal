// Shared helpers for scripts/verify/*.mjs — a zero-dependency static file
// server (same as scripts/check-a11y-responsive.mjs) plus a tiny PASS/FAIL
// reporter so every verify script prints and exits consistently.
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, relative, resolve } from 'node:path';

const root = resolve(process.cwd());

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.geojson': 'application/geo+json; charset=utf-8'
};

export function startServer() {
  const server = createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const filePath = normalize(join(root, pathname));
    if (!filePath.startsWith(root) || relative(root, filePath).startsWith('..')) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    if (!existsSync(filePath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime[extname(filePath).toLowerCase()] || 'application/octet-stream' });
    const stream = createReadStream(filePath);
    // A file vanishing mid-read must 500 one request, not crash the run.
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  });
  return new Promise((resolveServer) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolveServer({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

export function makeReporter(name) {
  const results = [];
  const check = (label, ok, detail = '') => {
    results.push({ label, ok, ...(detail ? { detail } : {}) });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`);
  };
  const finish = () => {
    const failed = results.filter(r => !r.ok).length;
    console.log(`\n${name}: ${results.length - failed}/${results.length} checks passed`);
    // Machine-readable artifact alongside the screenshots (CI-collectable).
    const outDir = join(resolve(process.cwd()), 'verify_out');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, `${name}.json`), JSON.stringify({ name, passed: results.length - failed, failed, results }, null, 2));
    process.exitCode = failed ? 1 : 0;
    return failed === 0;
  };
  return { check, finish };
}

// Pre-acknowledge the session-scoped prototype disclaimer, before the first
// navigation, for the checks that are NOT about it. Without this every script
// would measure a viewport with a fixed bottom bar in it — and the cookie
// banner, which is sequenced behind the disclaimer, would never render (which
// check-mobile-nav specifically depends on). Accepts a Page or a
// BrowserContext; both expose addInitScript. Mirrors PROTOTYPE_NOTICE_KEY in
// js/shell.js. check-prototype-notice.mjs is the one script that skips it.
export async function suppressPrototypeNotice(pageOrContext) {
  await pageOrContext.addInitScript(() => {
    try { sessionStorage.setItem('mp-prototype-notice', '1'); } catch { /* storage disabled */ }
  });
}

// Log in via the prototype's demo hook and clear both first-visit banners
// (prototype disclaimer, then cookie consent — the consent bar only renders
// once the disclaimer is gone) so neither can shift layout or intercept
// clicks. This is the ONLY place test code touches the auth stub — when eIAM
// replaces window.t3lite.demoRole in the MVP, this function is the single
// seam to update. check-prototype-notice.mjs deliberately skips this helper.
export async function loginAs(page, baseUrl, role = 'LBO') {
  await page.goto(`${baseUrl}/#/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.portal?.dismissPrototypeNotice?.());
  await page.evaluate(() => window.portal?.acceptCookieConsent?.('necessary'));
  if (role) {
    await page.evaluate((r) => window.t3lite.demoRole(r), role);
    await page.waitForTimeout(350);
  }
}

// Deterministic route readiness: the router stamps the hash it finished
// handling onto #page-body (markRouteRendered in js/app.js). Waiting on
// that marker — plus font readiness, so width measurements are stable —
// replaces guessed sleeps after navigation.
//
// `hash` may be an array when the route legitimately resolves to more than
// one place: `#/` renders the public landing while logged out but forwards to
// the role home once authenticated, and the prototype now boots signed in.
//
// A route that forwards stamps ITSELF first (handleHash marks the hash it
// handled, then the redirect re-renders), so matching the marker alone can
// latch onto a frame that is about to be replaced — the assertion then races
// the second render. Requiring the address bar to agree with the marker waits
// for the router to come to rest.
export async function waitForRoute(page, hash, timeout = 10000) {
  const accepted = Array.isArray(hash) ? hash : [hash];
  await page.waitForFunction(
    (hs) => {
      const route = document.getElementById('page-body')?.dataset.route;
      if (!hs.includes(route)) return false;
      return (location.hash || '#/').split('?')[0] === route;
    },
    accepted,
    { timeout },
  );
  await page.evaluate(() => document.fonts?.ready);
}

// Run a script body with crash containment: a thrown Playwright error
// (click timeout, dead selector) records as a failed check instead of
// killing the process before the summary prints. `cleanup` always runs.
export async function run({ check, finish }, body, cleanup) {
  try {
    await body();
  } catch (err) {
    check('script completed without unexpected errors', false, String(err?.message || err).split('\n')[0]);
  } finally {
    if (cleanup) await cleanup();
  }
  finish();
}
