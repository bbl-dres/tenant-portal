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
    <button class="btn btn--bare catbar__filter" type="button" id="${id}-filter"
            aria-expanded="${panelOpen}" aria-controls="${id}-panel">
      ${icon('filter')}<span>${escapeHtml(filterLabel)}</span>
      ${filterCount ? `<span class="catbar__filter-count">${filterCount}</span>` : ''}
      ${icon('chevronDown', 'catbar__chevron')}
    </button>` : '';

  const controls = sortHtml + filterHtml + viewSwitch(view, views) + extra;

  return `
    <div class="catbar${search ? '' : ' catbar--no-search'}">
      ${searchHtml}
      ${count ? `<p class="catbar__count" id="${id}-count">${escapeHtml(count)}</p>` : ''}
      ${controls ? `<div class="catbar__controls">${controls}</div>` : ''}
    </div>
    ${panel ? `<div class="catbar__panel" id="${id}-panel"${panelOpen ? '' : ' hidden'}>${panel}</div>` : ''}`;
}

/**
 * Wire a rendered bar. `hashFor(patch)` returns the destination hash for a
 * changed control; the caller owns the query-parameter vocabulary of its own
 * route. Every control resets `page` through the caller's hashFor.
 *
 * `onSearchInput` is optional and only used by surfaces with live suggestions.
 */
export function wireCatalogueBar({ id = 'cat', hashFor, onSearchInput } = {}) {
  const form = document.getElementById(`${id}-form`);
  const input = document.getElementById(`${id}-q`);
  if (form && input && hashFor) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      location.hash = hashFor({ q: input.value.trim(), page: 1 });
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
    });
  }

  if (hashFor) {
    document.querySelectorAll('.view-switch__btn').forEach(btn => {
      btn.addEventListener('click', () => {
        location.hash = hashFor({ view: btn.getAttribute('data-view'), page: 1 });
      });
    });
  }
}
