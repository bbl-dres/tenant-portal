/* ==========================================================================
   DATA-TABLE.JS — the recurring «long table inside a detail view» surface.

   A catalogue page has had search, sorting, filtering and pagination since
   catalogue-bar.js landed. The tables inside detail views did not: Verträge,
   Geschosse, Dokumente and Vorgänge on a property rendered every row, in one
   fixed order, with no way to look for anything. That is survivable at ten
   demo rows and not at federal scale — a real building carries hundreds of
   documents — and it also made the same list behave differently depending on
   which page it appeared on.

   This is the ONE component for that surface, assembled from the pieces the
   portal already has rather than a second implementation beside them:
   catalogue-bar.js draws the bar, `paginationShell` draws the footer,
   `.table--zebra` draws the table.

   TWO DECISIONS worth stating.

   State is LOCAL, not in the hash. These tables live in tabs, and the tab is
   itself hash state: routing a sort through the URL would re-render the route
   and throw the reader back to the Übersicht tab. Nothing here touches
   `location`.

   The BAR is drawn once; only the count, the filter badge, the table and the
   pagination are redrawn. Searching therefore never replaces the field the
   reader is typing into, so focus and caret survive per keystroke without a
   save-and-restore dance around innerHTML.
   ========================================================================== */

import { escapeHtml as esc } from './lib.js';
import { catalogueBar, wireCatalogueBar, setFilterCount } from './catalogue-bar.js';
import { paginationShell, wirePaginationInput, countText } from './pagination.js';

// Same page size as the sister service-portal's detail tables, so a reader
// moving between the two prototypes meets one rhythm.
const PER_PAGE = 10;

/**
 * @param {HTMLElement} host   element to render into
 * @param {object} cfg
 * @param {string}   cfg.id            unique prefix for every id in this block
 * @param {Array}    cfg.rows          the full row set
 * @param {Array}    cfg.columns       [{ key, label, align, render(row) }]
 * @param {object}   cfg.unit          { one, many, dative } for counts
 * @param {string[]} [cfg.searchKeys]  row fields the search reads
 * @param {Function} [cfg.search]      (row, q) => boolean, instead of searchKeys
 * @param {Array}    [cfg.sorts]       [{ value, label, cmp }] — first is the default
 * @param {Array}    [cfg.facets]      [{ dim, legend, options:[{value,label}], match(row, values) }]
 * @param {number}   [cfg.perPage]
 * @param {Function} [cfg.foot]        (visible, filtered) => <tr> markup
 * @param {string}   [cfg.hint]        footnote below the table (interaction)
 * @param {string}   [cfg.emptyMsg]    shown when there is no data at all
 * @param {string}   [cfg.caption]     table caption (sr-only)
 * @param {string}   [cfg.label]       accessible name of the table
 * @param {Function} [cfg.rowClass]     (row) => string, for a marked-out row
 * @param {Function} [cfg.onRowClick]  (row) => void; makes the whole row a target
 * @returns {Function} disposer
 */
export function mountDataTable(host, cfg = {}) {
  const {
    id = 'dt', rows: allRows = [], columns = [], unit = {},
    searchKeys = [], search, sorts = [], facets: declaredFacets = [], perPage = PER_PAGE,
    foot, emptyMsg, caption, label, rowClass, onRowClick, hint,
  } = cfg;
  /* A dimension with no values in THIS row set is not a filter — it is an
     empty drawer behind a button that promises one. Facets are usually derived
     from the rows, so an empty one is normal (a property with no Vorgänge has
     no statuses), and where nothing survives the Filter control itself does
     not appear. Same rule as the sister portal's detail tables. */
  const facets = declaredFacets.filter((facet) => (facet.options || []).length);
  const one = unit.one || 'Eintrag';
  const many = unit.many || 'Einträge';
  // German dative for «von 12 Dokumenten»; nouns that do not decline pass the
  // plural again (Liegenschaften), exactly as paginationShell expects.
  const dative = unit.dative || many;

  // The bar's count answers «how much did my search and filters remove»; the
  // pagination footer below answers «where am I in the result». They overlap
  // only while nothing is filtered, which is the case where neither is needed.
  const count = (shown) => countText({ total: allRows.length, shown, one, many, dative });

  const state = { q: '', sort: sorts.length ? sorts[0].value : '', page: 1, sel: {} };
  facets.forEach((facet) => { state.sel[facet.dim] = []; });

  const matchesQuery = (row) => {
    if (!state.q) return true;
    const q = state.q.toLowerCase();
    if (typeof search === 'function') return search(row, q);
    return searchKeys.some((key) => String(row[key] == null ? '' : row[key]).toLowerCase().includes(q));
  };
  const matchesFacets = (row) => facets.every((facet) => {
    const values = state.sel[facet.dim] || [];
    if (!values.length) return true;
    return typeof facet.match === 'function' ? facet.match(row, values) : values.includes(String(row[facet.dim]));
  });

  const panelHTML = facets.map((facet) => `
    <fieldset class="catbar__fieldset">
      <legend class="catbar__legend">${esc(facet.legend)}</legend>
      <div class="catbar__options">
        ${facet.options.map((option, index) => `
          <label class="catbar__option">
            <input type="checkbox" data-facet="${esc(facet.dim)}" value="${esc(option.value)}"
                   id="${esc(id)}-f-${esc(facet.dim)}-${index}">
            <span>${esc(option.label)}</span>
          </label>`).join('')}
      </div>
    </fieldset>`).join('');

  host.innerHTML = catalogueBar({
    id,
    search: true,
    searchLabel: `${many} durchsuchen`,
    placeholder: `${many} durchsuchen …`,
    // A count has to be present in the first render or catalogueBar omits the
    // element, and every later update would have nothing to write into.
    count: count(allRows.length),
    sort: sorts.length ? { value: state.sort, options: sorts.map((s) => [s.value, s.label]) } : null,
    filterLabel: facets.length ? 'Filter' : '',   // no facets → no control
    panel: panelHTML,
  }) + `<div id="${esc(id)}-body"></div>`;

  const body = host.querySelector(`#${CSS.escape(id)}-body`);
  const countEl = host.querySelector(`#${CSS.escape(id)}-count`);

  const cell = (column, row) => {
    const align = column.align === 'right' ? ' class="text-right"' : '';
    return `<td${align}>${column.render(row)}</td>`;
  };

  const draw = () => {
    const filtered = allRows.filter((row) => matchesQuery(row) && matchesFacets(row));
    const sortDef = sorts.find((s) => s.value === state.sort);
    const sorted = sortDef && sortDef.cmp ? filtered.slice().sort(sortDef.cmp) : filtered;
    const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
    if (state.page > totalPages) state.page = totalPages;
    const start = (state.page - 1) * perPage;
    const visible = sorted.slice(start, start + perPage);

    /* The table stays even with no hits, header and all. Swapping it for an
       empty state removed the columns, so a reader could no longer see what
       the table was ABOUT, and the page jumped every time a filter emptied it.
       The two empty cases read differently on purpose: nothing here at all is
       not the same as nothing for this search. */
    const emptyText = allRows.length
      ? `Keine ${many} für diese Suche oder Filterung.`
      : (emptyMsg || `Keine ${many} erfasst.`);

    body.innerHTML = `
      <div class="table-wrapper">
        <table class="table table--zebra${onRowClick ? ' table--rows-clickable' : ''}"${
  label ? ` aria-label="${esc(label)}"` : ''}>
          ${caption ? `<caption class="sr-only">${esc(caption)}</caption>` : ''}
          <thead>
            <tr>${columns.map((column) => `<th scope="col"${
    column.align === 'right' ? ' class="text-right"' : ''}>${esc(column.label)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${visible.length
    ? visible.map((row, index) => {
      const rc = rowClass ? rowClass(row) : '';
      return `<tr data-row="${start + index}"${rc ? ` class="${esc(rc)}"` : ''}>${
        columns.map((column) => cell(column, row)).join('')}</tr>`;
    }).join('')
    : `<tr><td colspan="${columns.length}" class="table__empty">${esc(emptyText)}</td></tr>`}
          </tbody>
          ${visible.length && foot ? `<tfoot>${foot(visible, sorted)}</tfoot>` : ''}
        </table>
      </div>
      ${/* A footnote BELOW the table, for what the table DOES rather than what
            it holds — «click a row to open it» is an interaction, and there is
            nowhere else the reader would learn it. Only while there is
            something to interact with. */''}
      ${hint && visible.length ? `<p class="table-hint">${esc(hint)}</p>` : ''}
      ${/* The footer stays over an empty result, like the bar and the header
            above it: this portal's footer is a RANGE STATEMENT first («1–11 von
            11 Vorgängen») and a page selector second, and «Keine Anhänge» is a
            true statement about the range. scripts/verify/check-detail-tables
            asserts it on every detail tab. */''}
      ${paginationShell({
    current: state.page, totalPages,
    inputId: `${id}-page`,
    nav: { kind: 'button' },
  })}`;

    // The row set the delegated click handler below resolves against.
    draw.sorted = sorted;
    if (countEl) countEl.innerHTML = count(sorted.length);
    setFilterCount(id, facets.reduce((n, facet) => n + (state.sel[facet.dim] || []).length, 0));
    // Re-bound per draw against the freshly written controls; the clamp reads
    // the input's `max`, which the shell just stamped with this page count.
    wirePaginationInput(`${id}-page`, {
      onPage: (page) => { state.page = page; draw(); },
    });
  };

  /* One delegated handler on `host`, which survives every redraw — binding
     inside draw() would add a listener per keystroke. */
  const onClick = (event) => {
    if (!onRowClick) return;
    const tr = event.target.closest('tr[data-row]');
    if (!tr || !host.contains(tr)) return;
    // A real link in the row keeps its own behaviour, so ctrl-click, middle
    // click and «open in new tab» still work, and so does the keyboard path.
    if (event.target.closest('a, button, input, select, textarea')) return;
    // Selecting text inside a row is not a click on it.
    if (String(window.getSelection() || '').length) return;
    const row = (draw.sorted || [])[Number(tr.dataset.row)];
    if (row) onRowClick(row);
  };
  host.addEventListener('click', onClick);

  // `wireCatalogueBar` with no `hashFor` still does the two things this needs:
  // it stops the <form> from performing a native GET (which would drop the
  // fragment and reload the app at #/), and it toggles the filter panel.
  wireCatalogueBar({
    id,
    onSearchInput: (input) => { state.q = input.value.trim(); state.page = 1; draw(); },
  });
  const sortEl = host.querySelector(`#${CSS.escape(id)}-sort`);
  if (sortEl) sortEl.addEventListener('change', () => { state.sort = sortEl.value; state.page = 1; draw(); });
  const panelEl = host.querySelector(`#${CSS.escape(id)}-panel`);
  if (panelEl) {
    panelEl.addEventListener('change', (event) => {
      const box = event.target.closest('input[data-facet]');
      if (!box) return;
      const dim = box.dataset.facet;
      state.sel[dim] = [...panelEl.querySelectorAll(`input[data-facet="${CSS.escape(dim)}"]:checked`)]
        .map((input) => input.value);
      state.page = 1;
      draw();
    });
  }

  draw();
  return () => { host.removeEventListener('click', onClick); };
}

/** Distinct values of one field, as facet options in German collation. */
export function facetOptions(rows, key, labelOf) {
  return [...new Set(rows.map((row) => String(row[key] == null ? '' : row[key])).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'de'))
    .map((value) => ({ value, label: labelOf ? labelOf(value) : value }));
}
