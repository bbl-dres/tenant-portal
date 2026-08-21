/* Structure tree — held to the sister service-portal's component.
 *
 * css/components/spatial-tree.css and js/spatial-tree.js are a port of that
 * portal's sidebar-tree component, and a port drifts silently: the previous
 * iteration had grown horizontal rules between rows, a blue selection bar, a
 * blue innermost guide and counts in brackets, none of which upstream has. So
 * the numbers below are not taste — they are what the service portal computes,
 * measured there and written down here. If upstream changes, port it and
 * update these; do not adjust one side alone.
 *
 * Run: node scripts/verify/check-spatial-tree.mjs
 */
import { chromium } from 'playwright';
import { startServer } from './lib.mjs';

let failures = 0;
const check = (condition, label, detail = '') => {
  if (!condition) failures++;
  console.log(`   ${condition ? '✓' : '✗'} ${label}${detail ? `  — ${detail}` : ''}`);
};
const section = (title) => console.log(`\n■ ${title}`);
const is = (actual, expected, label) => check(actual === expected, label, `${actual} (want ${expected})`);

const { server, baseUrl } = await startServer();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  await page.goto(`${baseUrl}/#/properties`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  /* Drill in far enough that a path, a selection, a guide and a leaf are all
     on screen at once — every state the component draws. */
  const drilled = await page.evaluate(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const rows = () => [...document.querySelectorAll('.pf-tree__row')].filter((row) => row.offsetParent);
    const trail = [];
    for (const label of ['Schweiz', 'BE', 'Bern']) {
      const row = rows().find((r) => r.textContent.includes(label));
      trail.push(row ? label : `MISSING ${label}`);
      if (row) { row.click(); await wait(400); }
    }
    const we = rows().find((r) => /WE /.test(r.textContent));
    if (we) { we.click(); await wait(500); }
    /* The LABEL, not the row text: a row also carries a screen-reader kind
       word and the count, so reading textContent here would assert the whole
       spoken line rather than what is written in the column. */
    return { trail, we: we ? we.querySelector('.pf-tree__label').textContent.trim() : '' };
  });
  section('Five levels, from country down to the object');
  check(!drilled.trail.some((step) => step.startsWith('MISSING')), 'the geographic levels open', drilled.trail.join(' › '));
  check(/^WE \d+/.test(drilled.we), 'and a Wirtschaftseinheit sits below the city', drilled.we);

  const styleOf = (selector, keys, pseudo = null) => page.evaluate(([sel, ks, ps]) => {
    const element = document.querySelector(sel);
    if (!element) return null;
    const cs = getComputedStyle(element, ps);
    return Object.fromEntries(ks.map((k) => [k, cs[k]]));
  }, [selector, keys, pseudo]);

  section('Row geometry is the upstream row');
  const row = await styleOf('.pf-tree__row', ['minHeight', 'paddingTop', 'paddingRight', 'paddingBottom',
    'borderRadius', 'fontSize', 'lineHeight', 'gap', 'borderTopWidth']);
  is(row.minHeight, '44px', 'min-height');
  is(`${row.paddingTop} ${row.paddingRight} ${row.paddingBottom}`, '4px 8px 4px', 'padding block and right');
  is(row.borderRadius, '2px', 'corner radius');
  is(`${row.fontSize}/${row.lineHeight}`, '14px/17.5px', 'type');
  is(row.gap, '8px', 'gap');
  /* The single most visible regression of the old port. */
  is(row.borderTopWidth, '0px', 'no rule between rows');

  section('Indentation is a cumulative running sum, computed in JS');
  const indents = await page.evaluate(() => [...document.querySelectorAll('.pf-tree__row')]
    .filter((r) => r.offsetParent)
    .map((r) => ({
      indent: getComputedStyle(r.closest('.pf-tree__item')).getPropertyValue('--pf-ind').trim(),
      level: r.getAttribute('aria-level'),
      leaf: !!r.dataset.obj,
    })));
  const atLevel = (level) => indents.find((entry) => entry.level === String(level));
  /* 20 gutter, then 24 per level that reserves an icon column and 16 per level
     that does not. The Wirtschaftseinheit carries no icon, so it steps 16 —
     and the leaf, one past the end of the levels, steps 16 again. */
  is(atLevel(1)?.indent, '20px', 'level 1 starts at the gutter');
  is(atLevel(2)?.indent, '44px', 'level 2 adds an icon column');
  is(atLevel(3)?.indent, '68px', 'level 3 adds another');
  is(atLevel(4)?.indent, '92px', 'level 4 adds another');
  is(indents.find((entry) => entry.leaf)?.indent, '108px', 'the leaf adds a plain step, not an icon column');

  section('State is never colour alone: each carries an edge bar');
  const path = await styleOf('.pf-tree__row.is-path', ['backgroundColor', 'borderLeftWidth', 'borderLeftColor']);
  const active = await styleOf('.pf-tree__row.is-active', ['backgroundColor', 'borderLeftWidth', 'borderLeftColor', 'fontWeight']);
  is(path.backgroundColor, 'rgb(243, 244, 246)', 'the path is gray-100');
  is(`${path.borderLeftWidth} ${path.borderLeftColor}`, '3px rgb(130, 142, 154)', 'with a secondary-300 bar');
  is(active.backgroundColor, 'rgb(223, 228, 233)', 'the selection is secondary-100');
  /* Grey, not the portal blue. The blue bar was the other visible divergence. */
  is(`${active.borderLeftWidth} ${active.borderLeftColor}`, '3px rgb(107, 114, 128)', 'with a GREY bar, not primary');
  is(active.fontWeight, '700', 'and bold');

  section('The chevron sits outside the label flow');
  const slot = await styleOf('.pf-tree__chev-slot', ['position', 'width', 'pointerEvents', 'color']);
  is(slot.position, 'absolute', 'the slot is taken out of flow');
  is(slot.width, '20px', 'and is exactly the gutter wide');
  /* So a row with no chevron still starts its label at the same x, and the
     click always reaches the row underneath. */
  is(slot.pointerEvents, 'none', 'it never swallows the row click');

  section('Lucide icons, not the CD glyph set');
  const icons = await page.evaluate(() => [...document.querySelectorAll('.pf-tree__ico use')]
    .map((u) => u.getAttribute('href')));
  check(icons.length > 0 && icons.every((href) => href.startsWith('assets/icons/lucide/')),
    'every level icon comes from the vendored Lucide subset', icons.slice(0, 3).join(', '));
  const ico = await page.evaluate(() => {
    const element = document.querySelector('.pf-tree__ico');
    const box = element.getBoundingClientRect();
    return { w: Math.round(box.width), h: Math.round(box.height), color: getComputedStyle(element).color };
  });
  /* The Lucide roots declare width/height="24"; without a viewBox on the
     wrapper the <use> clone renders at 24 and the 16px box clips it. */
  is(`${ico.w}×${ico.h}`, '16×16', 'and is scaled by the wrapper, not clipped');
  is(ico.color, 'rgb(75, 85, 99)', 'in the muted grey');

  section('The count is a bare number at the right edge');
  const count = await styleOf('.pf-tree__n', ['marginLeft', 'paddingLeft', 'fontSize', 'color']);
  check(parseFloat(count.marginLeft) > 20, 'pushed right by margin-left:auto', count.marginLeft);
  is(count.fontSize, '12px', 'one step down');
  const countText = await page.$eval('.pf-tree__n', (element) => element.textContent);
  /* The brackets were CSS, so the DOM already read «10»; what changed is that
     they are no longer drawn. */
  check(/^\d+$/.test(countText), 'with no brackets around it', countText);
  const before = await styleOf('.pf-tree__n', ['content'], '::before');
  is(before.content, 'none', 'and none added by CSS');

  section('One thin guide along the open branch, no accent');
  const guide = await styleOf('.pf-tree__children:has(.is-active, .is-path)', ['width', 'left', 'backgroundColor'], '::after');
  is(guide.width, '1px', 'hairline');
  is(guide.left, '10px', 'on the parent chevron axis');
  /* The old port drew the innermost list 2px in primary blue. */
  is(guide.backgroundColor, 'rgb(172, 180, 189)', 'secondary-200, never primary');

  section('The selection reaches the URL, the filter and the chip');
  const selection = await page.evaluate(() => ({
    hash: location.hash,
    chip: [...document.querySelectorAll('.filter-pill')].map((e) => e.textContent.replace(/\s+/g, ' ').trim())[0] || '',
    results: document.querySelectorAll('.pf-card, .search-result, .property-card').length,
  }));
  check(/[?&]we=\d+/.test(selection.hash), 'the Wirtschaftseinheit is shareable', selection.hash);
  check(/WE \d+/.test(selection.chip), 'and removable as a chip', selection.chip);

  section('Keyboard: one tab stop, arrows move');
  const keys = await page.evaluate(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const rows = () => [...document.querySelectorAll('.pf-tree__row')].filter((r) => r.offsetParent);
    const stops = rows().filter((r) => r.tabIndex === 0).length;
    rows()[0].focus();
    rows()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await wait(120);
    return { stops, moved: document.activeElement === rows()[1] };
  });
  is(keys.stops, 1, 'exactly one row is reachable by Tab');
  check(keys.moved, 'and ArrowDown moves to the next');

  check(errors.length === 0, 'no page errors', errors.slice(0, 2).join(' | '));
  await page.close();
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}

console.log(`\n${failures ? `✗ ${failures} check(s) FAILED` : '✓ all checks passed'}`);
process.exit(failures ? 1 : 0);
