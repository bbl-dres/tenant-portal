/* ==========================================================================
   CATALOGUE-BAR.JS — the toolbar above every catalogue-like surface.

   ONE component for the row that sits between a page heading and its results,
   whatever the results are: a table (Vorgänge, Pläne & Dokumente, Geschosse),
   a gallery (Liegenschaften) or a map. Before this, each surface hand-rolled
   its own arrangement — the properties page had a search field, a category
   `select` and a three-way view toggle; downloads had three stacked selects;
   the inbox had a search field and filter chips — so the same four controls
   appeared in three different orders, at three sizes, with three different
   focus and label treatments.

   ANATOMY (designsystem css/components/search.postcss «SEARCH RESULTS PAGE»
   + the sister portal's catbar): search and hit count on the left; after one
   divider, sort, an optional filter toggle, and the view switch on the right;
   an optional filter panel below the row. Pagination is rendered by the
   caller BELOW the results — a catalogue always paginates, but the count and
   the page controls sit at opposite ends of the list.

   MARKUP ONLY, plus an opt-in wiring helper. The component never reads app
   state and never writes the hash itself: `wireCatalogueBar` takes a
   `hashFor(patch)` from the caller, because only the caller knows which query
   parameters its route carries.
   ========================================================================== */

import { icon, escapeHtml } from './lib.js';

// The bar is one compact toolbar: field, sort, filter and view controls share
// a single control height so the row never re-flows between viewport widths.
// This deliberately does NOT adopt the DS's responsive control growth (btn
// 44→48px at xl) — a toolbar that changes height mid-page reads as a layout
// bug rather than as responsiveness.

function viewSwitch(view, views) {
  if (!views || !views.length) return '';
  return `
    <div class="view-switch" role="group" aria-label="Ansicht wechseln">
      ${views.map(([key, label, iconName]) => `
        <button class="view-switch__btn${view === key ? ' view-switch__btn--active' : ''}"
                type="button" id="view-${escapeHtml(key)}" data-view="${escapeHtml(key)}"
                aria-pressed="${view === key}" title="${escapeHtml(label)}">
          ${icon(iconName)}<span class="view-switch__label">${escapeHtml(label)}</span>
        </button>`).join('')}
    </div>`;
}
// (The filter toggle's chevron is panel-mode only: a drawer opens BELOW the
// button, which the rotating chevron communicates. When `filterControls`
// points the toggle at an external surface (the filter sidebar), the
// pressed fill state carries the open/closed signal on its own.)

/**
 * @param {object}   o
 * @param {string}  [o.id]            prefix for the ids this bar owns
 * @param {boolean} [o.search]        render the search field
 * @param {string}  [o.q]             current query
 * @param {string}  [o.searchLabel]   accessible name for the field + landmark
 * @param {string}  [o.placeholder]
 * @param {string}  [o.inputAttrs]    extra attributes for the input (RAW — the
 *                                    properties combobox adds its ARIA here)
 * @param {string}  [o.searchSlot]    RAW markup inside the field wrapper (the
 *                                    combobox listbox); caller escapes
 * @param {string}  [o.count]         hit count, already localised
 * @param {object}  [o.sort]          { value, options: [[value, label], …] }
 * @param {string}  [o.filterLabel]   renders the filter toggle when set
 * @param {number}  [o.filterCount]   active filter count shown on the toggle
 * @param {string}  [o.panel]         RAW filter-panel markup; caller escapes
 * @param {string}  [o.view]          active view key
 * @param {Array}   [o.views]         [[key, label, iconName], …]
 * @param {string}  [o.extra]         RAW markup appended to the control group
 */
export function catalogueBar({
  id = 'cat', search = false, q = '', searchLabel = 'Suchen', placeholder = 'Suchen …',
  inputAttrs = '', searchSlot = '', count = '', sort = null,
  filterLabel = '', filterCount = 0, panel = '', panelOpen = false,
  filterControls = '',   // id the toggle discloses; defaults to the bar's own panel
  view = '', views = null, extra = '',
} = {}) {
  const searchHtml = search ? `
    <form class="catbar__search" id="${id}-form" role="search" aria-label="${escapeHtml(searchLabel)}">
      <label class="sr-only" for="${id}-q">${escapeHtml(searchLabel)}</label>
      <input id="${id}-q" class="input catbar__input" type="search" name="q"
             value="${escapeHtml(q)}" placeholder="${escapeHtml(placeholder)}"
             autocomplete="off" ${inputAttrs}>
      <button class="btn btn--bare catbar__submit" type="submit" aria-label="${escapeHtml(searchLabel)}">${icon('search')}</button>
      ${searchSlot}
    </form>` : '';

  // Bare select with an sr-only label — the CD pattern for a toolbar sort
  // (indexPage.vue): the chosen option is its own visible label, so a
  // permanent «Sortierung:» prefix would only add noise to the row.
  const sortHtml = sort ? `
    <label class="sr-only" for="${id}-sort">Sortierung</label>
    <select id="${id}-sort" class="input catbar__sort">
      ${sort.options.map(([value, label]) => `
        <option value="${escapeHtml(value)}"${String(sort.value) === String(value) ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('')}
    </select>` : '';

  const filterHtml = filterLabel ? `
    <button class="btn btn--bare catbar__filter${panelOpen ? ' catbar__filter--open' : ''}" type="button" id="${id}-filter"
            aria-expanded="${panelOpen}" aria-controls="${filterControls || `${id}-panel`}">
      ${icon('filter')}<span>${escapeHtml(filterLabel)}</span>
      <span class="catbar__filter-count"${filterCount ? '' : ' hidden'}>${filterCount || ''}</span>
      ${filterControls ? '' : icon('chevronDown', 'catbar__chevron')}
    </button>` : '';

  const controls = sortHtml + filterHtml + viewSwitch(view, views) + extra;

  return `
    <div class="catbar${search ? '' : ' catbar--no-search'}">
      ${searchHtml}
      ${/* READY HTML, not a plain string: CD emphasises the number itself
             («<strong>127</strong>Suchergebnisse», searchResults.vue:83-87), so
             the sentence arrives already marked up. `countText` in
             js/pagination.js is the one builder every caller uses, and it
             escapes its own interpolations. */''}
      ${count ? `<p class="catbar__count" id="${id}-count" aria-live="polite">${count}</p>` : ''}
      ${controls ? `<div class="catbar__controls">${controls}</div>` : ''}
    </div>
    ${panel ? `<div class="catbar__panel" id="${id}-panel"${panelOpen ? '' : ' hidden'}>${panel}</div>` : ''}`;
}

// Resolve the `.catbar` element a given bar id rendered into — anchored on
// the id-carrying controls (`#${id}-sort`, then `#${id}-form`), so a bar
// never captures another bar's view switch (review M-VIEWSWITCH). Falls back
// to `document` for a caller whose bar has neither control.
function barEl(id) {
  return document.getElementById(`${id}-sort`)?.closest('.catbar')
    || document.getElementById(`${id}-form`)?.closest('.catbar')
    || document;
}

/**
 * Wire a rendered bar. `hashFor(patch)` returns the destination hash for a
 * changed control; the caller owns the query-parameter vocabulary of its own
 * route. Every control resets `page` through the caller's hashFor.
 *
 * `onSearchInput` is optional and only used by surfaces with live suggestions.
 * `onView` (review M-VIEWSWITCH) claims the view switch for a surface that
 * switches IN PAGE: when present it receives the clicked view key instead of
 * the hash navigation. Pair it with `setActiveView` to re-sync the pressed
 * state after the in-page re-render.
 */
export function wireCatalogueBar({ id = 'cat', hashFor, onSearchInput, onView } = {}) {
  const form = document.getElementById(`${id}-form`);
  const input = document.getElementById(`${id}-q`);
  if (form && input) {
    // ALWAYS bind submit, even for in-page surfaces that pass no hashFor:
    // the bar renders a real <form>, so without preventDefault, Enter in the
    // search field performs a NATIVE GET submission — the fragment is
    // dropped, the whole app reloads at #/ and every filter is lost.
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (hashFor) location.hash = hashFor({ q: input.value.trim(), page: 1 });
      // In-page surfaces already filter through their own `input` listener;
      // Enter simply commits what is on screen.
    });
  }
  if (input && onSearchInput) input.addEventListener('input', () => onSearchInput(input));

  const sort = document.getElementById(`${id}-sort`);
  if (sort && hashFor) {
    sort.addEventListener('change', () => { location.hash = hashFor({ sort: sort.value, page: 1 }); });
  }

  // The panel is toggled in place rather than through the hash: opening a
  // filter drawer is not a navigation, and routing it would re-render the
  // page and close the drawer the user just opened.
  const filter = document.getElementById(`${id}-filter`);
  const panel = document.getElementById(`${id}-panel`);
  if (filter && panel) {
    filter.addEventListener('click', () => {
      const open = panel.hidden;
      panel.hidden = !open;
      filter.setAttribute('aria-expanded', String(open));
      filter.classList.toggle('catbar__filter--open', open);
    });
  }

  if (hashFor || onView) {
    barEl(id).querySelectorAll('.view-switch__btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        if (onView) onView(view);
        else location.hash = hashFor({ view, page: 1 });
      });
    });
  }
}

/**
 * Re-sync the view switch's pressed state on a bar that switches views IN
 * PAGE (review M-VIEWSWITCH) — the bar is not re-rendered there, so the
 * active tint cannot come from `catalogueBar()`. Scoped through the same
 * `barEl` lookup as the wiring.
 */
export function setActiveView(id, view) {
  barEl(id).querySelectorAll('.view-switch__btn').forEach(btn => {
    const on = btn.getAttribute('data-view') === view;
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('view-switch__btn--active', on);
  });
}

/**
 * Update the active-filter badge on a bar that filters IN PAGE (the bar itself
 * is not re-rendered, so the count cannot come from `catalogueBar()`). The
 * badge node is always emitted — hidden at zero — precisely so this can find
 * it; when it was conditional the badge simply never appeared and an active
 * filter was invisible once the panel was collapsed.
 */
/** Refresh the count of an already-rendered bar. `html` comes from countText. */
export function setCount(id, html) {
  const el = document.getElementById(`${id}-count`);
  if (el) el.innerHTML = html;
}

export function setFilterCount(id, n) {
  const badge = document.querySelector(`#${id}-filter .catbar__filter-count`);
  if (!badge) return;
  badge.textContent = n ? String(n) : '';
  badge.hidden = !n;
}

/**
 * Wire the bar's filter toggle to a `.pf-sidebar` filter sidebar (review
 * M-SIDEBAR) — the shared mechanics behind the properties location tree and
 * the downloads filter panel. The toggle flips `pf-layout--sidebar-hidden`
 * on the surrounding `.pf-layout`, keeps its own aria-expanded + pressed
 * tint in sync, and reports the resulting visibility through
 * `onToggle(open)` — persisting that state (URL vs. in-page docState) is
 * the caller's business. The X in the sidebar head delegates to the toggle
 * so state and URL stay in ONE code path; focus lands on the toggle, which
 * is what re-opens the panel.
 */
export function wireSidebarToggle({ buttonId, onToggle }) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.addEventListener('click', () => {
    const layout = document.querySelector('.pf-layout');
    if (!layout) return;
    const open = !layout.classList.toggle('pf-layout--sidebar-hidden');
    btn.setAttribute('aria-expanded', String(open));
    btn.classList.toggle('catbar__filter--open', open);
    if (onToggle) onToggle(open);
  });
  const sidebarClose = document.querySelector('.pf-sidebar__close');
  if (sidebarClose) sidebarClose.addEventListener('click', () => {
    btn.click();
    btn.focus();
  });
}

/**
 * Wire a multi-value checkbox facet (review M-CHECKGROUP): every
 * `input[name="…"]` toggles its value in and out of the caller's array via
 * `get`/`set` — the setter owns whatever follows (page reset, re-render).
 * Returns `{ sync() }`, which re-checks the boxes from `get()` after the
 * state changed elsewhere (pill removal / clear-all), because the sidebar
 * controls are not re-rendered in place.
 */
export function wireCheckboxGroup(name, { get, set }) {
  const boxes = () => document.querySelectorAll(`input[name="${name}"]`);
  boxes().forEach(box => {
    box.addEventListener('change', () => {
      const next = box.checked
        ? [...get(), box.value]
        : get().filter(v => v !== box.value);
      set(next);
    });
  });
  return {
    sync() {
      boxes().forEach(box => { box.checked = get().includes(box.value); });
    },
  };
}

/**
 * Active-filter pill row — ONE builder for the `.filter-pills` markup that
 * the properties and downloads catalogues used to hand-roll separately
 * (review M-PILLS). The surfaces differ only in the removal mechanism:
 *   hrefFor given   → hash-navigated list: each remove control is an
 *                     <a href> built by `hrefFor(key)`, clear-all links to
 *                     `clearAllHref` (properties).
 *   hrefFor omitted → in-page list: remove controls are <button
 *                     data-clear="key">, clear-all is <button
 *                     data-clear="all"> — the caller binds its own delegated
 *                     [data-clear] listener, because only the caller knows
 *                     which state a cleared key resets (downloads).
 * `pills` is [{ key, label, value }, …]; labels come from the caller's i18n
 * table (trusted), values are user/data input and are escaped here. Returns
 * '' when nothing is active — no empty pill row is ever emitted.
 *
 * The aria-label names the filter AND its value («Filter Typ: Vertrag
 * entfernen») so two pills of the same facet stay distinguishable.
 */
export function filterPills({ pills, hrefFor = null, clearAllHref = null, clearAllLabel }) {
  if (!pills || !pills.length) return '';
  const removeControl = (p) => {
    const aria = `aria-label="Filter ${escapeHtml(p.label)}: ${escapeHtml(p.value)} entfernen"`;
    return hrefFor
      ? `<a class="filter-pill__remove" href="${hrefFor(p.key)}" ${aria}>
           ${icon('x', 'filter-pill__remove-icon')}
         </a>`
      : `<button type="button" class="filter-pill__remove" data-clear="${escapeHtml(p.key)}" ${aria}>
           ${icon('x', 'filter-pill__remove-icon')}
         </button>`;
  };
  const clearAll = hrefFor
    ? `<a class="filter-pills__clear-all" href="${clearAllHref}">${escapeHtml(clearAllLabel)}</a>`
    : `<button class="filter-pills__clear-all" type="button" data-clear="all">${escapeHtml(clearAllLabel)}</button>`;
  return `
    <div class="filter-pills" aria-label="Aktive Filter">
      ${pills.map(p => `
        <span class="filter-pill">
          <span class="filter-pill__label">${p.label}:</span>
          <span class="filter-pill__value">${escapeHtml(p.value)}</span>
          ${removeControl(p)}
        </span>
      `).join('')}
      ${clearAll}
    </div>
  `;
}
