/* ==========================================================================
   PAGINATION.JS — the CD Bund compact pagination, in one place.

   Lifted out of app.js unchanged so js/data-table.js can render a footer
   without importing the application module that imports IT. Same markup, same
   two navigation modes, same wiring contract; only the `icon` call lost its
   `P.` prefix, because here it is an import rather than a portal global.
   ========================================================================== */

import { icon } from './lib.js';

// CD Bund pagination — compact pattern from the federal design system
// (designsystem css/components/pagination.postcss, app/components/ch/components/Pagination.vue):
//   [count] [chevron-left] [page-input] von X Seiten [chevron-right]
// Anchor-based chevrons so middle-click + share + back/forward all work;
// the page-input is an editable number field — submit on Enter or blur
// to jump directly to a page (the only scalable affordance at thousands
// of pages, where a list of numbered buttons stops working).
// Rendered unconditionally — federal data sets scale to thousands of
// records, so a persistent pagination footer is a load-bearing
// affordance even when the current filter happens to return ≤ 1 page.
// Generic across routes: caller passes `hrefFor: (page) => string` to
// build URLs, plus `entitySingular`/`entityPlural` for the count label
// ("1 Antrag" / "1–12 von 247 Anträgen" / "Keine Anträge"). The de-CH
// thousands separator keeps four-digit totals legible (e.g. "1'247").
// The hrefFor closure is stashed in a module-level Map keyed by
// `inputId` so `wirePaginationInput` can navigate without round-tripping
// the URL through a fragile data-attribute template.
const _paginationHrefBuilders = new Map();
// ONE definition of the CD Bund compact pagination markup (count line ·
// chevron-prev · page input · "von X Seiten" · chevron-next), shared by every
// paginated surface so the look + pluralisation never diverge. `nav` selects
// the control mechanism:
//   { kind: 'link', hrefFor }  → <a href> prev/next  (hash-navigated lists)
//   { kind: 'button' }         → <button data-step> prev/next (in-place lists)
export function paginationShell({ current, totalPages, from, to, totalItems, entitySingular, entityPlural, entityPluralDative, inputId, nav }) {
  const fmt = (n) => n.toLocaleString('de-CH');
  // German dative plural for the "von X …" count (e.g. Dokumente → Dokumenten);
  // defaults to the nominative plural for nouns that don't decline (Liegenschaften).
  const dative = entityPluralDative || entityPlural;
  const countText = totalItems === 0
    ? `Keine ${entityPlural}`
    : totalItems === 1
      ? `1 ${entitySingular}`
      : `${fmt(from)}–${fmt(to)} von ${fmt(totalItems)} ${dative}`;
  const ctrl = (step, disabled, label, iconName) => nav.kind === 'link'
    ? `<a class="btn btn--outline btn--icon-only" href="${nav.hrefFor(step < 0 ? Math.max(1, current - 1) : Math.min(totalPages, current + 1))}" aria-label="${label}"
         ${disabled ? 'aria-disabled="true" tabindex="-1"' : ''}>${icon(iconName)}</a>`
    : `<button class="btn btn--outline btn--icon-only" type="button" data-step="${step}" aria-label="${label}"
              ${disabled ? 'disabled' : ''}>${icon(iconName)}</button>`;
  return `
    <nav class="pagination" role="navigation" aria-label="Seitennavigation">
      <span class="pagination__count" aria-live="polite">${countText}</span>
      ${ctrl(-1, current <= 1, 'Vorherige Seite', 'chevronLeft')}
      <input class="pagination__input" type="number" inputmode="numeric"
             id="${inputId}" min="1" max="${totalPages}" value="${current}"
             aria-label="Seite auswählen">
      <span class="pagination__text">von ${totalPages} Seite${totalPages === 1 ? '' : 'n'}</span>
      ${ctrl(1, current >= totalPages, 'Nächste Seite', 'chevronRight')}
    </nav>
  `;
}

// Hash-navigated pagination (properties, …): the shell with <a href> controls,
// plus the hrefFor closure registered for `wirePaginationInput`.
export function renderPagination({ current, totalPages, from, to, totalItems, entitySingular, entityPlural, hrefFor, inputId }) {
  const id = inputId || 'paginationInput';
  _paginationHrefBuilders.set(id, hrefFor);
  return paginationShell({ current, totalPages, from, to, totalItems, entitySingular, entityPlural, inputId: id, nav: { kind: 'link', hrefFor } });
}

// Wire a paginationShell's page-input field, in one of two modes matching
// the shell's `nav` kinds (review M-PAGING):
//   hash mode (default)     — looks up the hrefFor closure from the Map
//     populated by `renderPagination` and navigates on Enter / change.
//   in-place mode (`onPage`) — reports the clamped page number to the caller
//     instead, and also binds the <button data-step> chevrons inside the
//     same <nav>. The clamp reads the input's `max` attribute, which
//     paginationShell stamps with the totalPages of the CURRENT render —
//     re-wired per render, so it never goes stale.
export function wirePaginationInput(inputId, { onPage } = {}) {
  const id = inputId || 'paginationInput';
  const el = document.getElementById(id);
  if (!el) return;
  const hrefFor = _paginationHrefBuilders.get(id);
  if (!onPage && !hrefFor) return;
  const clamp = (n) => {
    const max = parseInt(el.getAttribute('max'), 10) || 1;
    return Math.max(1, Math.min(max, n));
  };
  const commit = (page) => {
    if (onPage) onPage(page);
    else location.hash = hrefFor(page);
  };
  const go = () => commit(clamp(parseInt(el.value, 10) || 1));
  el.addEventListener('change', go);
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); go(); }
  });
  if (onPage) {
    el.closest('nav')?.querySelectorAll('button[data-step]').forEach(btn => {
      btn.addEventListener('click', () => {
        commit(clamp((parseInt(el.value, 10) || 1) + parseInt(btn.dataset.step, 10)));
      });
    });
  }
}
