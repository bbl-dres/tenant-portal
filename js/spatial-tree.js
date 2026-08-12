// Sidebar structure tree (`.pf-tree`) — ported from the sister service-portal
// (js/ui/spatial-tree.js + css/sections/explorer.css, design variant H2 of its
// «Standortbaum» wireframe study). One <li class="pf-tree__item"> per level,
// whose button carries levels as `data-country` / `data-region` / `data-city`,
// a count in `<span class="pf-tree__n">`, and leaves with `data-obj`.
//
// The tree is rendered ONCE per route render; counts are synchronised rather
// than regenerated so expanded branches and selection survive filter changes.
// Adaptations from upstream: the portal's `escapeHtml`/`icon` helpers are
// imported directly instead of arriving on a component context `C`, and icon
// names use the portal's lowercase registry keys. The optional sub-leaf level
// (Plan-Editor floors) is not ported — no portal surface needs it yet.

import { escapeHtml as esc, icon } from './lib.js';

// Synchronise counts and visibility with the current filters.
//
// `visible` is the list remaining AFTER search and facets, deliberately without
// the tree selection itself. Otherwise a click would leave only the selected
// branch showing «1», turning navigation into a dead end.
//
// `levelsOf(entry)` returns level values in country · region · city order
// (shorter trees return fewer), and `idOf(entry)` returns the ID carried by
// leaves in `data-obj`.
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

  root.querySelectorAll('.pf-tree__node').forEach((button) => {
    const data = button.dataset;
    const levels = [data.country, data.region, data.city].filter((value) => value !== undefined);
    const count = counts.get(levels.join('▸')) || 0;
    const field = button.querySelector('.pf-tree__n');
    if (field) field.textContent = String(count);
    // Hide empty branches instead of offering a «0» that leads nowhere.
    button.closest('.pf-tree__item').hidden = count === 0;
  });
  root.querySelectorAll('.pf-tree__leaf').forEach((button) => {
    button.closest('.pf-tree__item').hidden = !ids.has(button.dataset.obj);
  });
  // Filtering can hide the row that currently holds the tree's single tab stop,
  // which would leave the whole tree unreachable by keyboard. Put it back on a
  // visible row — the selected one if it survived the filter, else the first.
  const reachable = [...root.querySelectorAll('.pf-tree__node, .pf-tree__leaf')]
    .filter((button) => button.offsetParent !== null);
  if (!reachable.length) return;
  // Row dividers are LEADING rules (css/components/spatial-tree.css), which
  // leaves the column without a trailing line. CSS clears the rule on the first
  // top-level row, but filtering can hide exactly that row — so mark whichever
  // row is actually first now, otherwise a line hangs under the sidebar head.
  root.querySelectorAll('.is-first-row').forEach((row) => row.classList.remove('is-first-row'));
  reachable[0].classList.add('is-first-row');
  // Keep the roving tab stop where it is while its row is still visible —
  // this tail runs on every count sync (each keystroke of the live preview),
  // and unconditionally moving the stop yanked keyboard users off the row
  // they were on (review m7). Only reassign when the previous stop is hidden
  // or absent.
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
// with the sister portal's explorers. `leaf` describes the leaf:
//   { icon: (o) => …, idText: (o) => …, label: (o) => …, objId: (o) => …, sort }
// Leaves automatically carry data attributes for ALL ancestor levels plus
// `data-obj`, exactly the shape read by syncTreeCounts/wireTree/restore.
const compareGerman = (a, b) => String(a).localeCompare(String(b), 'de');

export function treeHTML(objects, { levels, leaf, ariaLabel = 'Struktur' }) {
  // The count is a bare number in the DOM — the parentheses are drawn by CSS —
  // and it gains a named figure for assistive technology, which would
  // otherwise hear «Schweiz 7».
  const countHTML = (count, unit) => `<span class="pf-tree__n">${count}</span>${
    unit ? `<span class="sr-only"> ${esc(unit)}</span>` : ''}`;
  const rowContent = (iconName, idText, label, kindWord) => `${icon(iconName, 'pf-tree__ico')}${
    kindWord ? `<span class="sr-only">${esc(kindWord)}: </span>` : ''}${
    idText ? `<span class="pf-tree__id">${esc(idText)}</span>` : ''}<span class="pf-tree__label">${esc(label)}</span>`;
  const nodeHTML = (content, count, unit, attrs, children, level) => `<li class="pf-tree__item" role="none">
      <button type="button" class="pf-tree__node" role="treeitem" tabindex="-1"
        aria-level="${level}" aria-selected="false" aria-expanded="false" ${attrs}>
        ${icon('chevronRight', 'pf-tree__chev')}${content}${countHTML(count, unit)}
      </button>
      <ul class="pf-tree__children" role="group" hidden>${children}</ul></li>`;

  const attrPairs = (pairs) => pairs.map(([attribute, value]) => `data-${attribute}="${esc(value)}"`).join(' ');

  const build = (items, depth, ancestors) => {
    const level = depth + 1;
    if (depth === levels.length) {
      const sorted = leaf.sort ? items.slice().sort(leaf.sort) : items;
      return sorted.map((object) => {
        const pairs = [...ancestors, ['obj', leaf.objId(object)]];
        return `<li class="pf-tree__item" role="none"><button type="button" class="pf-tree__leaf"
          role="treeitem" tabindex="-1" aria-level="${level}" aria-selected="false" ${attrPairs(pairs)}>${
          rowContent(leaf.icon(object), leaf.idText ? leaf.idText(object) : '', leaf.label(object), leaf.word)}</button></li>`;
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
      return nodeHTML(
        rowContent(levelDef.icon, levelDef.idText ? levelDef.idText(key, entries) : '',
          label(key, entries), levelDef.word),
        entries.length, levelDef.countWord || 'Objekte', attrPairs(pairs),
        build(entries, depth + 1, pairs), level);
    }).join('');
  };
  return `<ul class="pf-tree" role="tree" aria-label="${esc(ariaLabel)}">${build(objects, 0, [])}</ul>`;
}

// Two-tone marking: the selected node is active (primary inner edge bar), while
// its ancestor path (country › region › city) uses light grey. This keeps the
// drill-down chain visible despite shallow indentation.
export function markTree(sidebar, activeNode) {
  sidebar.querySelectorAll('.pf-tree__node, .pf-tree__leaf')
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
    const parentNode = list.parentElement.querySelector(':scope > .pf-tree__node, :scope > .pf-tree__leaf');
    if (parentNode) parentNode.classList.add('is-path');
    item = list.parentElement;
  }
}

// Click wiring: nodes expand/collapse and select their level, while leaves
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
    const leafButton = event.target.closest('.pf-tree__leaf');
    if (leafButton) { // Leaf: filter to the object, not a detail jump.
      const selection = ancestry(leafButton);
      selection.id = leafButton.dataset.obj;
      select(selection, leafButton);
      return;
    }
    const node = event.target.closest('.pf-tree__node'); if (!node) return;
    toggle(node);
    const selection = {};
    for (const key of attrs) if (node.dataset[key] != null) selection[key] = node.dataset[key];
    select(selection, node);
  });
  // --- Keyboard: the ARIA tree pattern ---------------------------------------
  // The whole tree is ONE tab stop with a roving tabindex — without it,
  // reaching the content past the tree means tabbing through every row.
  const rows = () => [...sidebar.querySelectorAll('.pf-tree__node, .pf-tree__leaf')]
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
    const row = event.target.closest('.pf-tree__node, .pf-tree__leaf');
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
        ? list.parentElement.querySelector(':scope > .pf-tree__node, :scope > .pf-tree__leaf')
        : null;
      focusRow(parent);
    }
  });
  // Clicking also moves the tab stop, so Tab and the pointer never disagree.
  sidebar.addEventListener('click', () => syncTabStop());
  syncTabStop();
  return { syncTabStop };
}

// Restore tree selection from the URL: find its node, expand the path and mark
// it. Filtering already happens through app state; this handles the visible
// tree highlight. Compare via dataset rather than an attribute selector
// because SAP IDs contain «/».
export function restoreTreeSelection(sidebar, selection, { attrs = ['country', 'region', 'city'] } = {}) {
  if (!selection || !Object.keys(selection).length) return null;
  const button = selection.id
    ? [...sidebar.querySelectorAll('.pf-tree__leaf')].find((node) => node.dataset.obj === selection.id)
    : [...sidebar.querySelectorAll('.pf-tree__node')].find((n) =>
        attrs.every((key) => (n.dataset[key] || '') === (selection[key] || '')));
  if (!button) return null;
  let item = button.closest('.pf-tree__item');
  while (item) {
    const list = item.parentElement;
    if (!list || !list.classList.contains('pf-tree__children')) break;
    list.hidden = false;
    const parentNode = list.parentElement.querySelector(':scope > .pf-tree__node, :scope > .pf-tree__leaf');
    if (parentNode) parentNode.setAttribute('aria-expanded', 'true');
    item = list.parentElement;
  }
  // As on click, a restored node also reveals its children.
  if (button.classList.contains('pf-tree__node')) {
    const children = button.closest('.pf-tree__item').querySelector(':scope > .pf-tree__children');
    button.setAttribute('aria-expanded', 'true');
    if (children) children.hidden = false;
  }
  markTree(sidebar, button);
  return button;
}
