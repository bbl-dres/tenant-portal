// Sidebar structure tree (`.pf-tree`) — the markup half of the port of the
// sister service-portal's js/ui/components/sidebar-tree.js. Its CSS twin is
// css/components/spatial-tree.css; between them the rendered tree is the same
// component the service portal ships, so a future upstream diff stays
// mechanical. Two things are deliberately NOT ported:
//
//   · the component's own render loop. Upstream rebuilds the whole tree from
//     data on every state change. Here the tree is rendered ONCE per route
//     render and `syncTreeCounts` updates it in place, so expanded branches
//     and the selection survive a filter change — which is what this portal's
//     live search preview needs and upstream has no equivalent of.
//   · split rows (`.pf-tree__fold` beside a link). This tree selects, it does
//     not navigate, so every row is a plain button and the chevron is the
//     muted `.pf-tree__chev-slot` — exactly the shape upstream renders for its
//     own `mode: 'select'` explorers.
//
// What IS ported, and what the earlier iteration got wrong: indentation as a
// cumulative running sum in `--pf-ind` (CSS cannot express it, which is why
// upstream computes it in JS), the chevron sitting OUTSIDE the label flow so
// rows align whether foldable or not, and Lucide icons instead of the CD glyph
// set. Rows are one class, `.pf-tree__row`, as upstream — a group and a leaf
// differ by what they carry, not by a second class name.

import { escapeHtml as esc } from './lib.js';

// CSS cannot express the per-level running sum used for indentation.
// GUTTER is the chevron column; a level that shows icons reserves a wider step
// than one that relies on indentation alone.
const GUTTER = 20;
const ICON_COLUMN = 24;
const STEP = 16;

// The Lucide roots carry width/height="24". lib.js's `icon()` emits a
// viewBox-less <svg> wrapper, in which <use> clones them at that intrinsic size
// and the box clips them — so this wrapper carries the same viewBox and the
// clone scales with it instead. The files under assets/icons/lucide are
// vendored verbatim from the service portal (same sha256 as upstream Lucide
// 1.31.0), which is why they are not reformatted to suit `icon()`.
const LUCIDE_NAME = /^[a-z][a-z-]*$/;
const lucide = (name, cls) => (LUCIDE_NAME.test(String(name || ''))
  ? `<svg class="inline-icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="assets/icons/lucide/${name}.svg"/></svg>`
  : '');

// Synchronise counts and visibility with the current filters.
//
// `visible` is the list remaining AFTER search and facets, deliberately without
// the tree selection itself. Otherwise a click would leave only the selected
// branch showing «1», turning navigation into a dead end.
//
// `levelsOf(entry)` returns level values outermost-first (shorter trees return
// fewer), and `idOf(entry)` returns the ID carried by leaves in `data-obj`.
export function syncTreeCounts(root, visible, levelsOf, idOf) {
  if (!root) return;
  // One count per path prefix: «CH», «CH▸BE», «CH▸BE▸Bern», …
  const counts = new Map();
  for (const entry of visible) {
    const levels = levelsOf(entry);
    for (let index = 0; index < levels.length; index++) {
      const key = levels.slice(0, index + 1).join('▸');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  const ids = new Set(visible.map(idOf));

  // A group row is one that can be opened; a leaf is one that names an object.
  // Both are `.pf-tree__row` — the distinction is a property of the row, not a
  // second class, which is what lets the CSS be the upstream file unchanged.
  root.querySelectorAll('.pf-tree__row[aria-expanded]').forEach((button) => {
    const count = counts.get(button.dataset.path || '') || 0;
    const field = button.querySelector('.pf-tree__n');
    if (field) field.textContent = String(count);
    // Hide empty branches instead of offering a «0» that leads nowhere.
    button.closest('.pf-tree__item').hidden = count === 0;
  });
  root.querySelectorAll('.pf-tree__row[data-obj]').forEach((button) => {
    button.closest('.pf-tree__item').hidden = !ids.has(button.dataset.obj);
  });
  // Filtering can hide the row that currently holds the tree's single tab stop,
  // which would leave the whole tree unreachable by keyboard. Put it back on a
  // visible row — the selected one if it survived the filter, else the first.
  const reachable = [...root.querySelectorAll('.pf-tree__row')]
    .filter((button) => button.offsetParent !== null);
  if (!reachable.length) return;
  // Keep the roving tab stop where it is while its row is still visible —
  // this tail runs on every count sync (each keystroke of the live preview),
  // and unconditionally moving the stop yanked keyboard users off the row they
  // were on (review m7). Only reassign when the previous stop is hidden or
  // absent.
  if (reachable.some((button) => button.tabIndex === 0)) return;
  reachable.forEach((button) => { button.tabIndex = -1; });
  (reachable.find((button) => button.classList.contains('is-active')) || reachable[0]).tabIndex = 0;
}

// --- Construction ------------------------------------------------------------
// `levels` describes grouping levels from outside to inside:
//   { key: 'country', attr: 'country', icon: 'globe', label: (value, entries) => …,
//     idText: (value, entries) => …, sort: (a, b) => …, word, countWord }
// `attr` is the data-attribute name (default: key). The portal groups by
// `canton` but exposes it as `data-region`, keeping selection keys consistent
// with the sister portal's explorers.
//
// `icon` does double duty, exactly as upstream: it names the glyph AND declares
// that this DEPTH reserves an icon column. A level without one indents by a
// plain step and shows no glyph — which is how the service portal renders its
// business-entity level. The leaf sits one past the end of `levels`, so it has
// no icon column at all and `leaf` therefore takes no icon:
//
//   leaf: { idText: (o) => …, label: (o) => …, objId: (o) => …, sort, word }
//
// Leaves automatically carry data attributes for ALL ancestor levels plus
// `data-obj`, exactly the shape read by syncTreeCounts/wireTree/restore.
const compareGerman = (a, b) => String(a).localeCompare(String(b), 'de');

export function treeHTML(objects, { levels, leaf, ariaLabel = 'Struktur' }) {
  // Cumulative indentation: every level adds its own step, so a child can never
  // start left of its parent however the levels are configured.
  const rung = (depth) => {
    let x = GUTTER;
    for (let index = 0; index < depth; index++) {
      x += (levels[index] && levels[index].icon) ? ICON_COLUMN : STEP;
    }
    return x;
  };
  // The count is a bare number in the DOM and reads as one on screen; it gains
  // a named figure for assistive technology, which would otherwise hear
  // «Schweiz 7».
  const countHTML = (count, unit) => `<span class="pf-tree__n">${count}</span>${
    unit ? `<span class="sr-only"> ${esc(unit)}</span>` : ''}`;
  const rowContent = (iconName, idText, label, kindWord) => `${
    iconName ? lucide(iconName, 'pf-tree__ico') : ''}${
    kindWord ? `<span class="sr-only">${esc(kindWord)}: </span>` : ''}${
    idText ? `<span class="pf-tree__id">${esc(idText)}</span>` : ''}<span class="pf-tree__label">${esc(label)}</span>`;
  const chevron = `<span class="pf-tree__chev-slot" aria-hidden="true">${
    lucide('chevron-right', 'pf-tree__chev')}</span>`;

  const attrPairs = (pairs) => pairs.map(([attribute, value]) => `data-${attribute}="${esc(value)}"`).join(' ');

  const build = (items, depth, ancestors, path) => {
    const level = depth + 1;
    const indent = ` style="--pf-ind:${rung(depth)}px"`;
    if (depth === levels.length) {
      const sorted = leaf.sort ? items.slice().sort(leaf.sort) : items;
      return sorted.map((object) => {
        const pairs = [...ancestors, ['obj', leaf.objId(object)]];
        return `<li class="pf-tree__item" role="none"${indent}><button type="button" class="pf-tree__row"
          role="treeitem" tabindex="-1" aria-level="${level}" aria-selected="false" ${attrPairs(pairs)}>${
  rowContent('', leaf.idText ? leaf.idText(object) : '', leaf.label(object), leaf.word)}</button></li>`;
      }).join('');
    }
    const levelDef = levels[depth];
    const attribute = levelDef.attr || levelDef.key;
    const groups = new Map();
    for (const object of items) {
      const key = object[levelDef.key];
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(object);
    }
    const label = (key, entries) => (levelDef.label ? levelDef.label(key, entries) : key);
    const keys = [...groups.keys()].sort(levelDef.sort
      || ((a, b) => compareGerman(label(a, groups.get(a)), label(b, groups.get(b)))));
    return keys.map((key) => {
      const entries = groups.get(key);
      const pairs = [...ancestors, [attribute, key]];
      // `data-path` is the count key this row answers to. syncTreeCounts used
      // to rebuild it from data-country/region/city, which tied the counting to
      // those three names and would silently report 0 for any level added
      // later; the row now states its own key.
      const here = [...path, key];
      return `<li class="pf-tree__item" role="none"${indent}>
      <button type="button" class="pf-tree__row" role="treeitem" tabindex="-1"
        aria-level="${level}" aria-selected="false" aria-expanded="false"
        data-path="${esc(here.join('▸'))}" ${attrPairs(pairs)}>
        ${chevron}${rowContent(levelDef.icon, levelDef.idText ? levelDef.idText(key, entries) : '',
    label(key, entries), levelDef.word)}${countHTML(entries.length, levelDef.countWord || 'Objekte')}
      </button>
      <ul class="pf-tree__children" role="group" hidden>${build(entries, depth + 1, pairs, here)}</ul></li>`;
    }).join('');
  };
  // `pf-tree__section` is the class the guide and the count rules are scoped to
  // upstream, where one tree may hold several sections; here there is one.
  return `<ul class="pf-tree pf-tree__section" role="tree" aria-label="${esc(ariaLabel)}">${
    build(objects, 0, [], [])}</ul>`;
}

// Two-tone marking: the selected row is active (darker fill, bold, a grey edge
// bar), its ancestor path light grey with a lighter bar. This keeps the
// drill-down chain visible despite shallow indentation.
export function markTree(sidebar, activeNode) {
  sidebar.querySelectorAll('.pf-tree__row')
    .forEach((node) => {
      node.classList.remove('is-active', 'is-path');
      if (node.hasAttribute('aria-selected')) node.setAttribute('aria-selected', 'false');
    });
  if (!activeNode) return;
  activeNode.classList.add('is-active');
  if (activeNode.hasAttribute('aria-selected')) activeNode.setAttribute('aria-selected', 'true');
  let item = activeNode.closest('.pf-tree__item');
  while (item) {
    const list = item.parentElement;
    if (!list || !list.classList.contains('pf-tree__children')) break; // Reached the top-level list.
    const parentNode = list.parentElement.querySelector(':scope > .pf-tree__row');
    if (parentNode) parentNode.classList.add('is-path');
    item = list.parentElement;
  }
}

// Click wiring: group rows expand/collapse and select their level, while leaves
// select the object (`selection.id`). `onSelect(selection, node)` receives an
// object keyed by `attrs`; this function maintains markTree.
//
// There is deliberately no clear-selection control here. The selection appears
// as a removable chip in the active-filter row — which is where every other
// filter is cleared; a second control for the same job only split the model.
export function wireTree(sidebar, { attrs = ['country', 'region', 'city'], onSelect } = {}) {
  const select = (selection, node) => {
    markTree(sidebar, node);
    onSelect(selection, node);
  };
  const ancestry = (button) => {
    const selection = {};
    for (const key of attrs) if (button.dataset[key]) selection[key] = button.dataset[key];
    return selection;
  };
  // One level per click: a country opens its regions and nothing deeper.
  // Opening a whole branch was tried upstream and rejected — it buries the
  // column, and at estate scale a single click would unfold thousands of rows.
  const toggle = (button) => {
    const children = button.closest('.pf-tree__item').querySelector(':scope > .pf-tree__children');
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!expanded));
    if (children) children.hidden = expanded;
  };
  sidebar.addEventListener('click', (event) => {
    const row = event.target.closest('.pf-tree__row');
    if (!row) return;
    if (row.dataset.obj) { // Leaf: filter to the object, not a detail jump.
      const selection = ancestry(row);
      selection.id = row.dataset.obj;
      select(selection, row);
      return;
    }
    toggle(row);
    select(ancestry(row), row);
  });
  // --- Keyboard: the ARIA tree pattern ---------------------------------------
  // The whole tree is ONE tab stop with a roving tabindex — without it,
  // reaching the content past the tree means tabbing through every row.
  const rows = () => [...sidebar.querySelectorAll('.pf-tree__row')]
    .filter((row) => row.offsetParent !== null);
  const focusRow = (row) => {
    if (!row) return;
    rows().forEach((candidate) => { candidate.tabIndex = -1; });
    row.tabIndex = 0;
    row.focus();
  };
  // Exactly one row is reachable by Tab: the selected one if it is on screen,
  // the first otherwise. Re-run whenever the visible set changes.
  const syncTabStop = () => {
    const visible = rows();
    if (!visible.length) return;
    visible.forEach((row) => { row.tabIndex = -1; });
    (visible.find((row) => row.classList.contains('is-active')) || visible[0]).tabIndex = 0;
  };
  sidebar.addEventListener('keydown', (event) => {
    const row = event.target.closest('.pf-tree__row');
    if (!row || event.ctrlKey || event.metaKey || event.altKey) return;
    const visible = rows();
    const index = visible.indexOf(row);
    const expandable = row.hasAttribute('aria-expanded');
    const open = row.getAttribute('aria-expanded') === 'true';
    const step = (offset) => { event.preventDefault(); focusRow(visible[Math.max(0, Math.min(visible.length - 1, index + offset))]); };
    if (event.key === 'ArrowDown') return step(1);
    if (event.key === 'ArrowUp') return step(-1);
    if (event.key === 'Home') { event.preventDefault(); return focusRow(visible[0]); }
    if (event.key === 'End') { event.preventDefault(); return focusRow(visible[visible.length - 1]); }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (expandable && !open) { toggle(row); syncTabStop(); focusRow(row); } else step(1);
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (expandable && open) { toggle(row); syncTabStop(); focusRow(row); return; }
      // Otherwise move to the parent row, which is the level above this list.
      const list = row.closest('.pf-tree__item')?.parentElement;
      const parent = list?.classList.contains('pf-tree__children')
        ? list.parentElement.querySelector(':scope > .pf-tree__row')
        : null;
      focusRow(parent);
    }
  });
  // Clicking also moves the tab stop, so Tab and the pointer never disagree.
  sidebar.addEventListener('click', () => syncTabStop());
  syncTabStop();
  return { syncTabStop };
}

// Restore tree selection from the URL: find its row, expand the path and mark
// it. Filtering already happens through app state; this handles the visible
// tree highlight. Compare via dataset rather than an attribute selector because
// SAP IDs contain «/».
export function restoreTreeSelection(sidebar, selection, { attrs = ['country', 'region', 'city'] } = {}) {
  if (!selection || !Object.keys(selection).length) return null;
  const button = selection.id
    ? [...sidebar.querySelectorAll('.pf-tree__row[data-obj]')].find((node) => node.dataset.obj === selection.id)
    : [...sidebar.querySelectorAll('.pf-tree__row[aria-expanded]')].find((n) =>
      attrs.every((key) => (n.dataset[key] || '') === (selection[key] || '')));
  if (!button) return null;
  let item = button.closest('.pf-tree__item');
  while (item) {
    const list = item.parentElement;
    if (!list || !list.classList.contains('pf-tree__children')) break;
    list.hidden = false;
    const parentNode = list.parentElement.querySelector(':scope > .pf-tree__row');
    if (parentNode) parentNode.setAttribute('aria-expanded', 'true');
    item = list.parentElement;
  }
  // As on click, a restored group row also reveals its children.
  if (button.hasAttribute('aria-expanded')) {
    const children = button.closest('.pf-tree__item').querySelector(':scope > .pf-tree__children');
    button.setAttribute('aria-expanded', 'true');
    if (children) children.hidden = false;
  }
  markTree(sidebar, button);
  return button;
}
