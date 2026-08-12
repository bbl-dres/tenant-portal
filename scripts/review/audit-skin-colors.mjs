// Intranet-skin colour audit: resolve the ramps actually in effect, then walk
// every rendered element on a set of routes and flag any paint that still
// carries a PUBLIC-skin value (federal red / blue-gray secondary). Anything
// flagged is a surface that does not follow the skin — either a literal or a
// token that should alias primary/secondary but doesn't.
import { chromium } from 'playwright';
import { startServer, waitForRoute, suppressPrototypeNotice } from '../verify/lib.mjs';

const PUBLIC_RED = {
  '#ffedee': 'red-50', '#fae1e2': 'red-100', '#ffccce': 'red-200', '#fa9da1': 'red-300',
  '#fc656b': 'red-400', '#e53940': 'red-500', '#d8232a': 'red-600', '#bf1f25': 'red-700',
  '#99191e': 'red-800', '#801519': 'red-900',
};
const PUBLIC_SECONDARY = {
  '#596978': 'secondary-400(public)', '#46596b': 'secondary-500(public)',
  '#2f4356': 'secondary-600(public)', '#263645': 'secondary-700(public)',
  '#1c2834': 'secondary-800(public)', '#131b22': 'secondary-900(public)',
};

function rgbToHex(v) {
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(v || '');
  if (!m) return null;
  if (m[4] !== undefined && Number(m[4]) === 0) return null;   // fully transparent
  return '#' + [m[1], m[2], m[3]].map(n => Number(n).toString(16).padStart(2, '0')).join('');
}

const { server, baseUrl } = await startServer();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await suppressPrototypeNotice(context);
const page = await context.newPage();

const ROUTES = ['#/', '#/home', '#/inbox', '#/properties', '#/downloads', '#/search?q=bern', '#/info', '#/profile', '#/wizard/1', '#/queue'];

await page.goto(`${baseUrl}/#/`);
await waitForRoute(page, ['#/', '#/home']);

// 1. Which ramps are actually in effect?
const ramps = await page.evaluate(() => {
  const cs = getComputedStyle(document.body);
  const out = {};
  for (const fam of ['primary', 'secondary', 'red']) {
    for (const step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]) {
      out[`${fam}-${step}`] = cs.getPropertyValue(`--color-${fam}-${step}`).trim();
    }
  }
  out['bodyClass'] = document.body.className;
  return out;
});
console.log('=== ramps in effect ===');
console.log('body class:', ramps.bodyClass);
for (const fam of ['primary', 'secondary', 'red']) {
  console.log(fam.padEnd(10), [50,100,200,300,400,500,600,700,800,900].map(s => ramps[`${fam}-${s}`]).join(' '));
}

const findings = new Map();
for (const route of ROUTES) {
  const settled = route === '#/' ? ['#/', '#/home'] : [route.split('?')[0]];
  await page.goto(`${baseUrl}/${route}`);
  try { await waitForRoute(page, settled); } catch { console.log('skip (no route):', route); continue; }
  const hits = await page.evaluate(() => {
    const props = ['color', 'backgroundColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'fill', 'outlineColor'];
    const out = [];
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;               // not painted
      const cs = getComputedStyle(el);
      for (const p of props) {
        out.push({
          v: cs[p], p,
          sel: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''),
        });
      }
    }
    return out;
  });
  for (const h of hits) {
    const hex = rgbToHex(h.v);
    if (!hex) continue;
    const label = PUBLIC_RED[hex] || PUBLIC_SECONDARY[hex];
    if (!label) continue;
    const key = `${label}|${h.p}|${h.sel}`;
    if (!findings.has(key)) findings.set(key, { label, hex, prop: h.p, sel: h.sel, routes: new Set() });
    findings.get(key).routes.add(route);
  }
}

console.log('\n=== public-skin paints still in effect ===');
const rows = [...findings.values()].sort((a, b) => a.label.localeCompare(b.label) || a.sel.localeCompare(b.sel));
for (const f of rows) {
  console.log(`${f.label.padEnd(22)} ${f.hex}  ${f.prop.padEnd(17)} ${f.sel.slice(0, 70).padEnd(70)} ${[...f.routes].join(',')}`);
}
console.log(`\n${rows.length} distinct (colour × property × element) hits`);

await browser.close();
server.close();
